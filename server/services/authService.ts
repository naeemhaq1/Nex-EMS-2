
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sql } from "../db";

interface User {
  id: number;
  username: string;
  password: string;
  role: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  designation?: string;
  isActive: boolean;
  isTemporaryPassword?: boolean;
  lastPasswordChange?: Date;
}

interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password'>;
  token?: string;
  refreshToken?: string;
  error?: string;
  requiresPasswordChange?: boolean;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'nexlinx-ems-jwt-secret-2024';
  private readonly REFRESH_SECRET = process.env.REFRESH_SECRET || 'nexlinx-ems-refresh-secret-2024';
  private readonly TOKEN_EXPIRY = '15m'; // Access token expires in 15 minutes
  private readonly REFRESH_EXPIRY = '7d'; // Refresh token expires in 7 days

  /**
   * Generate JWT tokens for authenticated user
   */
  private generateTokens(user: Omit<User, 'password'>) {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId,
      department: user.department,
      designation: user.designation
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
    const refreshToken = jwt.sign({ userId: user.id }, this.REFRESH_SECRET, { expiresIn: this.REFRESH_EXPIRY });

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string, isRefreshToken = false): any {
    try {
      const secret = isRefreshToken ? this.REFRESH_SECRET : this.JWT_SECRET;
      return jwt.verify(token, secret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Authenticate user with username and password
   */
  async login(username: string, password: string): Promise<AuthResult> {
    try {
      // Get user from database
      const trimmedUsername = username.trim();
      const users = await sql`
        SELECT * FROM users 
        WHERE username = ${trimmedUsername} AND "isActive" = true
      `;

      if (users.length === 0) {
        return { success: false, error: "Invalid username or password" };
      }

      const user = users[0] as User;

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, error: "Invalid username or password" };
      }

      // Check if password change is required
      if (user.isTemporaryPassword) {
        return { 
          success: false, 
          error: "Password change required", 
          requiresPasswordChange: true
        };
      }

      // Remove password from user object
      const { password: _, ...userWithoutPassword } = user;

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(userWithoutPassword);

      return { 
        success: true, 
        user: userWithoutPassword, 
        token: accessToken,
        refreshToken 
      };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed" };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const decoded = this.verifyToken(refreshToken, true);
      if (!decoded) {
        return { success: false, error: "Invalid refresh token" };
      }

      // Get user from database
      const users = await sql`
        SELECT * FROM users 
        WHERE id = ${decoded.userId} AND "isActive" = true
      `;

      if (users.length === 0) {
        return { success: false, error: "User not found" };
      }

      const user = users[0] as User;
      const { password: _, ...userWithoutPassword } = user;

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(userWithoutPassword);

      return { 
        success: true, 
        user: userWithoutPassword, 
        token: accessToken,
        refreshToken: newRefreshToken 
      };
    } catch (error) {
      console.error("Refresh token error:", error);
      return { success: false, error: "Token refresh failed" };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<AuthResult> {
    try {
      const users = await sql`
        SELECT * FROM users 
        WHERE id = ${id} AND "isActive" = true
      `;

      if (users.length === 0) {
        return { success: false, error: "User not found" };
      }

      const user = users[0] as User;
      const { password: _, ...userWithoutPassword } = user;

      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error("Get user error:", error);
      return { success: false, error: "Failed to get user" };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const users = await sql`
        SELECT * FROM users 
        WHERE id = ${userId} AND "isActive" = true
      `;

      if (users.length === 0) {
        return { success: false, error: "User not found" };
      }

      const user = users[0] as User;

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return { success: false, error: "Current password is incorrect" };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await sql`
        UPDATE users 
        SET password = ${hashedPassword}, 
            "isTemporaryPassword" = false,
            "lastPasswordChange" = NOW()
        WHERE id = ${userId}
      `;

      return { success: true };
    } catch (error) {
      console.error("Change password error:", error);
      return { success: false, error: "Failed to change password" };
    }
  }

  /**
   * Set first-time password
   */
  async setFirstTimePassword(userId: number, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const users = await sql`
        SELECT * FROM users 
        WHERE id = ${userId} AND "isActive" = true
      `;

      if (users.length === 0) {
        return { success: false, error: "User not found" };
      }

      const user = users[0] as User;

      if (!user.isTemporaryPassword) {
        return { success: false, error: "Password has already been set" };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await sql`
        UPDATE users 
        SET password = ${hashedPassword}, 
            "isTemporaryPassword" = false,
            "lastPasswordChange" = NOW()
        WHERE id = ${userId}
      `;

      return { success: true };
    } catch (error) {
      console.error("Set first time password error:", error);
      return { success: false, error: "Failed to set password" };
    }
  }

  /**
   * Check if user has specific role
   */
  hasRole(userRole: string, requiredRoles: string[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * Check if user has minimum access level
   */
  hasAccessLevel(userRole: string, minLevel: number): boolean {
    const roleLevels = {
      'employee': 1,
      'supervisor': 3,
      'manager': 5,
      'admin': 8,
      'superadmin': 10
    };

    const userLevel = roleLevels[userRole as keyof typeof roleLevels] || 0;
    return userLevel >= minLevel;
  }
}

export const authService = new AuthService();

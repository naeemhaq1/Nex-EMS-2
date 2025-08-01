
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { randomBytes } from "crypto";
import { generateToken, getUserPermissions, ROLE_HIERARCHY } from "../middleware/auth";
import type { UserRole } from "../middleware/auth";

export class AuthService {
  /**
   * Authenticate user and return JWT token
   */
  async login(username: string, password: string) {
    try {
      console.log(`[AuthService] Login attempt for username: ${username}`);
      
      // Trim trailing spaces from username
      const trimmedUsername = username.trim();
      const user = await storage.getUserByUsername(trimmedUsername);
      
      if (!user) {
        console.log(`[AuthService] User not found: ${trimmedUsername}`);
        return { success: false, error: "Invalid username or password" };
      }

      if (!user.isActive) {
        console.log(`[AuthService] Inactive user attempted login: ${trimmedUsername}`);
        return { success: false, error: "Account is inactive" };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        console.log(`[AuthService] Invalid password for user: ${trimmedUsername}`);
        return { success: false, error: "Invalid username or password" };
      }

      // Check if password change is required
      if (user.isTemporaryPassword) {
        return { 
          success: false, 
          error: "Password change required", 
          requiresPasswordChange: true,
          userId: user.id 
        };
      }

      // Validate role
      if (!(user.role in ROLE_HIERARCHY)) {
        console.error(`[AuthService] Invalid role for user ${user.username}: ${user.role}`);
        return { success: false, error: "Invalid user role configuration" };
      }

      // Generate JWT token
      const token = generateToken(user);
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      const userWithPermissions = {
        ...userWithoutPassword,
        permissions: getUserPermissions(user.role as UserRole),
        roleLevel: ROLE_HIERARCHY[user.role as UserRole]
      };

      console.log(`[AuthService] Login successful for user: ${user.username} (${user.role})`);
      
      return { 
        success: true, 
        user: userWithPermissions,
        token
      };
      
    } catch (error) {
      console.error("[AuthService] Login error:", error);
      return { success: false, error: "Login failed due to system error" };
    }
  }

  /**
   * Get user by ID with permissions
   */
  async getUserById(id: number) {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      if (!user.isActive) {
        return { success: false, error: "User account is inactive" };
      }

      // Validate role
      if (!(user.role in ROLE_HIERARCHY)) {
        console.error(`[AuthService] Invalid role for user ${user.username}: ${user.role}`);
        return { success: false, error: "Invalid user role configuration" };
      }

      const { password: _, ...userWithoutPassword } = user;
      const userWithPermissions = {
        ...userWithoutPassword,
        permissions: getUserPermissions(user.role as UserRole),
        roleLevel: ROLE_HIERARCHY[user.role as UserRole]
      };

      return { success: true, user: userWithPermissions };
    } catch (error) {
      console.error("[AuthService] Get user error:", error);
      return { success: false, error: "Failed to get user" };
    }
  }

  /**
   * Verify token and return user data
   */
  async verifyToken(token: string) {
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || "nexlinx-ems-jwt-secret-2024-secure";
      
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Get fresh user data
      const result = await this.getUserById(decoded.id);
      
      return result;
    } catch (error) {
      console.error("[AuthService] Token verification error:", error);
      return { success: false, error: "Invalid or expired token" };
    }
  }

  async initiatePasswordReset(username: string, mobileNumber: string) {
    try {
      // Get user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Get employee record to verify mobile number
      const employee = await storage.getEmployeeByCode(user.employeeId || '');
      if (!employee || !employee.wanumber) {
        return { success: false, error: "Mobile number not found in system" };
      }

      // Check if mobile number matches (normalize format)
      const normalizedInput = mobileNumber.replace(/\D/g, ''); // Remove non-digits
      const normalizedEmployee = employee.wanumber.replace(/\D/g, '');
      
      if (normalizedInput !== normalizedEmployee) {
        return { success: false, error: "Mobile number does not match our records" };
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Update user with reset token
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });

      return { 
        success: true, 
        resetToken,
        message: "Password reset token generated successfully" 
      };
    } catch (error) {
      console.error("Password reset error:", error);
      return { success: false, error: "Failed to initiate password reset" };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return { success: false, error: "Invalid or expired reset token" };
      }

      // Check if token has expired
      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return { success: false, error: "Reset token has expired" };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        isTemporaryPassword: false,
        lastPasswordChange: new Date()
      });

      return { success: true, message: "Password reset successfully" };
    } catch (error) {
      console.error("Reset password error:", error);
      return { success: false, error: "Failed to reset password" };
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return { success: false, error: "Current password is incorrect" };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUser(userId, {
        password: hashedPassword,
        isTemporaryPassword: false,
        lastPasswordChange: new Date()
      });

      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      console.error("Change password error:", error);
      return { success: false, error: "Failed to change password" };
    }
  }

  async setFirstTimePassword(userId: number, newPassword: string) {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      if (!user.isTemporaryPassword) {
        return { success: false, error: "Password has already been set" };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUser(userId, {
        password: hashedPassword,
        isTemporaryPassword: false,
        lastPasswordChange: new Date()
      });

      return { success: true, message: "Password set successfully" };
    } catch (error) {
      console.error("Set first time password error:", error);
      return { success: false, error: "Failed to set password" };
    }
  }
}

export const authService = new AuthService();

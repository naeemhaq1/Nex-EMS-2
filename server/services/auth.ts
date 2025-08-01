import bcrypt from 'bcrypt';
import { sql } from '../db';
import { generateToken } from '../middleware/jwtAuth';

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
}

interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password'>;
  token?: string;
  error?: string;
  requiresPasswordChange?: boolean;
}

export class AuthService {
  /**
   * Authenticate user with username and password
   */
  async login(username: string, password: string): Promise<AuthResult> {
    try {
      const trimmedUsername = username.trim();

      const users = await sql`
        SELECT * FROM users 
        WHERE username = ${trimmedUsername} AND "isActive" = true
      `;

      if (users.length === 0) {
        return { success: false, error: 'Invalid username or password' };
      }

      const user = users[0] as User;

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Check if password change required
      if (user.isTemporaryPassword) {
        return { 
          success: false, 
          error: 'Password change required',
          requiresPasswordChange: true 
        };
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Generate token
      const token = generateToken(user);

      return { 
        success: true, 
        user: userWithoutPassword, 
        token 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Verify token and get user
   */
  async verifyToken(token: string): Promise<AuthResult> {
    try {
      // Token verification is handled in middleware
      // This method can be used for additional token validation if needed
      return { success: true };
    } catch (error) {
      console.error('Token verification error:', error);
      return { success: false, error: 'Token verification failed' };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const users = await sql`
        SELECT * FROM users WHERE id = ${userId} AND "isActive" = true
      `;

      if (users.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = users[0] as User;

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
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
      console.error('Change password error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }

  /**
   * Password reset request
   */
  async initiatePasswordReset(username: string, mobileNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Implement password reset logic
      return { success: false, error: 'Password reset not implemented yet' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Password reset failed' };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Implement password reset with token
      return { success: false, error: 'Password reset not implemented yet' };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'Password reset failed' };
    }
  }
}

export const authService = new AuthService();
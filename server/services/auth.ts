import bcrypt from "bcrypt";
import { storage } from "../storage";
import { randomBytes } from "crypto";
import { pool } from "../db";

export class AuthService {
  /**
   * Invalidate all existing sessions for a user (Single Sign-On enforcement)
   * This is critical for security - prevents session mixing
   */
  async invalidateAllUserSessions(userId: string | number) {
    try {
      console.log(`[SECURITY] Fast session cleanup for user: ${userId}`);
      
      // Optimized query using JSONB operators for better performance
      const query = `
        DELETE FROM session 
        WHERE sess::jsonb @> '{"userId":"${userId}"}' 
        OR sess::jsonb @> '{"usernum":${userId}}'
      `;
      
      // Set aggressive statement timeout to prevent login delays
      await pool.query('SET statement_timeout = 1000'); // 1 second limit for maximum speed
      const result = await pool.query(query);
      await pool.query('RESET statement_timeout');
      
      console.log(`[SECURITY] Fast cleanup completed: ${result.rowCount || 0} sessions removed`);
      
      return { success: true, invalidatedSessions: result.rowCount || 0 };
    } catch (error: any) {
      console.error("[SECURITY] Fast cleanup timeout/error (non-blocking):", error?.message || 'unknown error');
      // Don't block login on session cleanup timeouts
      return { success: false, error: "Session cleanup timeout" };
    }
  }

  async login(username: string, password: string) {
    try {
      // Trim trailing spaces from username
      const trimmedUsername = username.trim();
      const user = await storage.getUserByUsername(trimmedUsername);
      
      if (!user) {
        return { success: false, error: "Invalid username or password" };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
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

      // OPTIMIZED SECURITY: Fast session cleanup for single sign-on (timeout: 1.5s max)
      console.log(`[SECURITY] Fast SSO cleanup for user: ${user.username} (ID: ${user.id})`);
      
      // Use Promise.race to ensure login doesn't exceed 1.5 seconds for session cleanup
      await Promise.race([
        this.invalidateAllUserSessions(user.id),
        new Promise(resolve => setTimeout(resolve, 1500)) // 1.5-second timeout for faster login
      ]);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed" };
    }
  }

  async getUserById(id: number) {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error("Get user error:", error);
      return { success: false, error: "Failed to get user" };
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

import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { storage } from '../storage';
import { pool } from '../db';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  lastPasswordChange?: Date;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  requiresPasswordChange?: boolean;
  userId?: number;
}

export class StableAuthService {
  private static instance: StableAuthService;
  
  static getInstance(): StableAuthService {
    if (!StableAuthService.instance) {
      StableAuthService.instance = new StableAuthService();
    }
    return StableAuthService.instance;
  }

  /**
   * Authenticate user with username and password
   */
  async authenticateUser(username: string, password: string): Promise<AuthResult> {
    try {
      console.log(`[StableAuth] Authentication attempt for: ${username}`);
      
      // Trim and validate input
      const trimmedUsername = username.trim();
      if (!trimmedUsername || !password) {
        return { success: false, error: "Username and password are required" };
      }

      // Get user from database
      const user = await storage.getUserByUsername(trimmedUsername);
      if (!user) {
        console.log(`[StableAuth] User not found: ${trimmedUsername}`);
        return { success: false, error: "Invalid credentials" };
      }

      // Check if user is active
      if (!user.isActive) {
        console.log(`[StableAuth] Inactive user attempted login: ${trimmedUsername}`);
        return { success: false, error: "Account is inactive" };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log(`[StableAuth] Invalid password for user: ${trimmedUsername}`);
        return { success: false, error: "Invalid credentials" };
      }

      // Check for temporary password
      if (user.isTemporaryPassword) {
        console.log(`[StableAuth] User requires password change: ${trimmedUsername}`);
        return {
          success: false,
          error: "Password change required",
          requiresPasswordChange: true,
          userId: user.id
        };
      }

      console.log(`[StableAuth] Authentication successful: ${trimmedUsername}, Role: ${user.role}`);
      
      // Return user without password
      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastPasswordChange: user.lastPasswordChange
      };

      return { success: true, user: authUser };
    } catch (error) {
      console.error('[StableAuth] Authentication error:', error);
      return { success: false, error: "Authentication failed" };
    }
  }

  /**
   * Get user by ID for session verification
   */
  async getUserById(id: number): Promise<AuthUser | null> {
    try {
      const user = await storage.getUser(id);
      if (!user || !user.isActive) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastPasswordChange: user.lastPasswordChange
      };
    } catch (error) {
      console.error('[StableAuth] Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Validate user session and role
   */
  async validateSession(userId: number, requiredRole?: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return false;
      }

      if (requiredRole) {
        return this.hasRole(user.role, requiredRole);
      }

      return true;
    } catch (error) {
      console.error('[StableAuth] Session validation error:', error);
      return false;
    }
  }

  /**
   * Check if user has required role or higher privilege
   */
  hasRole(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'superadmin': 100,
      'general_admin': 90,
      'executive_director': 80,
      'general_manager': 70,
      'admin': 60,
      'manager': 50,
      'assistant_manager': 40,
      'supervisor': 30,
      'employee': 10
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Clear all user sessions (for single sign-on enforcement)
   */
  async clearUserSessions(userId: number): Promise<void> {
    try {
      console.log(`[StableAuth] Clearing sessions for user ID: ${userId}`);
      
      const query = `
        DELETE FROM session 
        WHERE sess::jsonb @> '{"userId":"${userId}"}' 
        OR sess::jsonb @> '{"usernum":${userId}}'
      `;
      
      await pool.query(query);
      console.log(`[StableAuth] Sessions cleared for user ID: ${userId}`);
    } catch (error) {
      console.error('[StableAuth] Error clearing user sessions:', error);
      // Don't throw error - session cleanup is not critical for login
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<AuthResult> {
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
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await storage.updateUser(userId, {
        password: hashedPassword,
        isTemporaryPassword: false,
        lastPasswordChange: new Date()
      });

      console.log(`[StableAuth] Password changed for user ID: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('[StableAuth] Password change error:', error);
      return { success: false, error: "Failed to change password" };
    }
  }

  /**
   * Set first-time password
   */
  async setFirstTimePassword(userId: number, newPassword: string): Promise<AuthResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      if (!user.isTemporaryPassword) {
        return { success: false, error: "Password has already been set" };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await storage.updateUser(userId, {
        password: hashedPassword,
        isTemporaryPassword: false,
        lastPasswordChange: new Date()
      });

      console.log(`[StableAuth] First-time password set for user ID: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('[StableAuth] Set first-time password error:', error);
      return { success: false, error: "Failed to set password" };
    }
  }
}

// Export singleton instance
export const stableAuth = StableAuthService.getInstance();

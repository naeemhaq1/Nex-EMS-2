
import { Request, Response, NextFunction } from 'express';
import { stableAuth } from '../services/stableAuth';

// Extend Express session interface
declare module 'express-session' {
  interface SessionData {
    stableUserId?: number;
    stableUsername?: string;
    stableUserRole?: string;
    stableLoginTime?: string;
    stableLastActivity?: string;
  }
}

export interface AuthenticatedRequest extends Request {
  stableUser?: {
    id: number;
    username: string;
    role: string;
    isActive: boolean;
  };
}

/**
 * Core authentication middleware
 */
export const requireStableAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.stableUserId;
    
    if (!userId) {
      console.log('[StableAuth] No user ID in session');
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate user session
    const isValid = await stableAuth.validateSession(userId);
    if (!isValid) {
      console.log(`[StableAuth] Invalid session for user ID: ${userId}`);
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Session expired" });
    }

    // Get fresh user data
    const user = await stableAuth.getUserById(userId);
    if (!user) {
      console.log(`[StableAuth] User not found for ID: ${userId}`);
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User not found" });
    }

    // Update last activity
    req.session.stableLastActivity = new Date().toISOString();
    
    // Attach user to request
    req.stableUser = user;
    
    next();
  } catch (error) {
    console.error('[StableAuth] Authentication middleware error:', error);
    return res.status(500).json({ error: "Authentication error" });
  }
};

/**
 * Role-based access control middleware
 */
export const requireStableRole = (requiredRole: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.stableUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const hasAccess = stableAuth.hasRole(req.stableUser.role, requiredRole);
      if (!hasAccess) {
        console.log(`[StableAuth] Access denied. User role: ${req.stableUser.role}, Required: ${requiredRole}`);
        return res.status(403).json({ error: `Access denied. ${requiredRole} role required` });
      }

      next();
    } catch (error) {
      console.error('[StableAuth] Role middleware error:', error);
      return res.status(500).json({ error: "Authorization error" });
    }
  };
};

/**
 * Admin access middleware
 */
export const requireStableAdmin = requireStableRole('admin');

/**
 * SuperAdmin access middleware
 */
export const requireStableSuperAdmin = requireStableRole('superadmin');

/**
 * Manager access middleware
 */
export const requireStableManager = requireStableRole('manager');

/**
 * Multi-role access middleware
 */
export const requireStableAnyRole = (roles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.stableUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const hasAccess = roles.some(role => stableAuth.hasRole(req.stableUser!.role, role));
      if (!hasAccess) {
        console.log(`[StableAuth] Access denied. User role: ${req.stableUser.role}, Required any of: ${roles.join(', ')}`);
        return res.status(403).json({ error: `Access denied. One of these roles required: ${roles.join(', ')}` });
      }

      next();
    } catch (error) {
      console.error('[StableAuth] Multi-role middleware error:', error);
      return res.status(500).json({ error: "Authorization error" });
    }
  };
};

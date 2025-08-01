
import { Request, Response, NextFunction } from 'express';
import { stableAuthService, StableUser } from '../services/stableAuth';

// Extend Express Request type to include stableUser
declare global {
  namespace Express {
    interface Request {
      stableUser?: StableUser;
    }
  }
}

// Extend session interface for stable auth
declare module "express-session" {
  interface SessionData {
    stableUserId?: number;
    stableUsername?: string;
    stableRole?: string;
    stableAuthTime?: number;
  }
}

/**
 * Middleware to verify stable authentication
 */
export const requireStableAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stableUserId = req.session.stableUserId;
    
    if (!stableUserId) {
      console.log('[StableAuth] No stable user ID in session');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user from database
    const user = await stableAuthService.getUserById(stableUserId);
    if (!user) {
      console.log(`[StableAuth] User not found or inactive: ${stableUserId}`);
      // Clear invalid session
      req.session.stableUserId = undefined;
      req.session.stableUsername = undefined;
      req.session.stableRole = undefined;
      req.session.stableAuthTime = undefined;
      
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Check session validity (optional: implement session timeout)
    const authTime = req.session.stableAuthTime || 0;
    const sessionMaxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (Date.now() - authTime > sessionMaxAge) {
      console.log(`[StableAuth] Session expired for user: ${user.username}`);
      // Clear expired session
      req.session.stableUserId = undefined;
      req.session.stableUsername = undefined;
      req.session.stableRole = undefined;
      req.session.stableAuthTime = undefined;
      
      return res.status(401).json({ error: 'Session expired' });
    }

    // Attach user to request
    req.stableUser = user;
    
    console.log(`[StableAuth] Authentication verified for: ${user.username} (${user.role})`);
    next();
  } catch (error) {
    console.error('[StableAuth] Authentication middleware error:', error);
    return res.status(500).json({ error: 'Authentication system error' });
  }
};

/**
 * Middleware to require specific permission
 */
export const requirePermission = (permission: keyof StableUser['permissions']) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.stableUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!stableAuthService.hasPermission(req.stableUser, permission)) {
      console.log(`[StableAuth] Permission denied: ${req.stableUser.username} lacks ${permission}`);
      return res.status(403).json({ error: `Permission denied: ${permission}` });
    }

    next();
  };
};

/**
 * Middleware to require minimum access level
 */
export const requireAccessLevel = (minLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.stableUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!stableAuthService.hasAccessLevel(req.stableUser, minLevel)) {
      console.log(`[StableAuth] Access level denied: ${req.stableUser.username} has level ${req.stableUser.permissions.accessLevel}, required ${minLevel}`);
      return res.status(403).json({ error: `Access level ${minLevel} required` });
    }

    next();
  };
};

/**
 * Middleware to require specific role
 */
export const requireRole = (...allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.stableUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.stableUser.role)) {
      console.log(`[StableAuth] Role denied: ${req.stableUser.username} has role ${req.stableUser.role}, required one of: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ error: 'Insufficient role permissions' });
    }

    next();
  };
};

/**
 * Middleware for SuperAdmin only access
 */
export const requireSuperAdmin = requireRole('superadmin');

/**
 * Middleware for Admin level access (SuperAdmin + Admin)
 */
export const requireAdmin = requireRole('superadmin', 'admin');

/**
 * Middleware for Manager level access (SuperAdmin + Admin + Manager)
 */
export const requireManager = requireRole('superadmin', 'admin', 'manager');

/**
 * Middleware for Finance access
 */
export const requireFinance = requireRole('superadmin', 'admin', 'finance');

/**
 * Middleware to check department access
 */
export const requireDepartmentAccess = (department: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.stableUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!stableAuthService.canAccessDepartment(req.stableUser, department)) {
      console.log(`[StableAuth] Department access denied: ${req.stableUser.username} cannot access ${department}`);
      return res.status(403).json({ error: 'Department access denied' });
    }

    next();
  };
};

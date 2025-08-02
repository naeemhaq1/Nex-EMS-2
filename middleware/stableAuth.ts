import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
        isAdmin?: boolean;
      };
    }
  }
}

export const stableAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is in session
    if (req.session && req.session.userId) {
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));

      if (user) {
        req.user = {
          id: user.id.toString(),
          username: user.username,
          role: user.role,
          isAdmin: ['admin', 'super_admin', 'superadmin'].includes(user.role)
        };
      }
    }
    next();
  } catch (error) {
    console.error('Stable auth middleware error:', error);
    next();
  }
};

/**
 * Middleware to verify stable authentication
 */
export const requireStableAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Middleware to require specific permission
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Assuming permissions are stored as a comma-separated string in user object
    // and that 'permissions' property exists on req.user object
    if (req.user.role !== permission && !req.user.isAdmin) {
      console.log(`[StableAuth] Permission denied: ${req.user.username} lacks ${permission}`);
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
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Assuming access level can be derived from user role or isAdmin status
    const accessLevel = req.user.isAdmin ? 99 : 1; // Example: Admin has level 99, others have level 1

    if (accessLevel < minLevel) {
      console.log(`[StableAuth] Access level denied: ${req.user.username} has level ${accessLevel}, required ${minLevel}`);
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
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[StableAuth] Role denied: ${req.user.username} has role ${req.user.role}, required one of: ${allowedRoles.join(', ')}`);
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
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Assuming a department property exists on req.user
    // And assuming department access is string matching
    // Modify logic as necessary to fit requirements.
    // if (!req.user.departments.includes(department)) {
    //   console.log(`[StableAuth] Department access denied: ${req.user.username} cannot access ${department}`);
    //   return res.status(403).json({ error: 'Department access denied' });
    // }
    // Example: assuming 'departments' is a comma seperated string.
    const departments = (req.user.departments || '').split(',');

    if (!departments.includes(department)) {
        console.log(`[StableAuth] Department access denied: ${req.user.username} cannot access ${department}`);
        return res.status(403).json({ error: 'Department access denied' });
    }

    next();
  };
};
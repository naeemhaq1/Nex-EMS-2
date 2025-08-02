import { Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db";
import { storage } from "../storage";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    usernum?: number;
    username?: string;
    role?: string;
    employeeId?: string;
    userAgent?: string;
    ipAddress?: string;
    loginTime?: string;
    realName?: string;
    location?: string;
    permissions?: {
      canCreateUsers: boolean;
      canDeleteUsers: boolean;
      canDeleteData: boolean;
      canAccessFinancialData: boolean;
      canManageSystem: boolean;
      canManageTeams: boolean;
      canChangeDesignations: boolean;
      accessLevel: number;
    };
  }
}

// Initialize PostgreSQL session store
const PostgreSQLStore = connectPgSimple(session);

// Export pool for use in other modules
export { pool };

export const sessionMiddleware = session({
  store: new PostgreSQLStore({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "nexlinx-ems-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
  name: 'connect.sid',
  rolling: true,
});

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Check if session exists
  if (!req.session) {
    console.error('[AUTH] Session not available - middleware not properly configured');
    return res.status(401).json({ error: "Session not configured" });
  }

  // Enhanced session validation with security checks
  const sessionId = req.sessionID;
  const userId = req.session.userId;
  const usernum = req.session.usernum;
  const role = req.session.role;

  console.log('[AUTH] Multi-role auth check:', {
    sessionId: !!sessionId,
    userId: userId,
    usernum: usernum,
    role: role,
    hasPermissions: !!req.session.permissions
  });

  // Check if either userId OR usernum is available (not both required)
  if (!userId && !usernum) {
    console.error('[AUTH] No user identifier in session');
    return res.status(401).json({ error: "Authentication required" });
  }

  // Additional security: verify session integrity
  if (!sessionId) {
    console.error('[AUTH] Session ID missing - potential security issue');
    return res.status(401).json({ error: "Invalid session" });
  }

  // Check if session data is consistent for multi-role system
  if (!req.session.username || !req.session.role) {
    console.error('[AUTH] Multi-role session data incomplete');
    return res.status(401).json({ error: "Session integrity check failed" });
  }

  // Validate role exists in the role management system
  try {
    const { roleManagementService } = await import('../services/roleManagementService.ts');
    const roleInfo = roleManagementService.getRoleById(req.session.role);

    if (!roleInfo) {
      console.error(`[AUTH] Invalid role in session: ${req.session.role}`);
      return res.status(401).json({ error: "Invalid user role" });
    }

    // Enhance request with role information for downstream middleware
    (req as any).user = {
      id: usernum || parseInt(userId),
      username: req.session.username,
      role: req.session.role,
      roleInfo: roleInfo,
      permissions: req.session.permissions,
      employeeId: req.session.employeeId
    };

    console.log('[AUTH] Multi-role authentication successful:', {
      username: req.session.username,
      role: req.session.role,
      accessLevel: roleInfo.level
    });

  } catch (error) {
    console.error('[AUTH] Error validating role:', error);
    return res.status(500).json({ error: "Authentication system error" });
  }

  next();
};

export const requireAccessLevel = (minLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userNum = req.session?.usernum;
    const userId = req.session?.userId;
    const userRole = req.session?.role;

    if (!userNum && !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { roleManagementService } = await import('../services/roleManagementService.ts');
      const roleInfo = roleManagementService.getRoleById(userRole || '');

      if (!roleInfo) {
        return res.status(403).json({ error: "Invalid role" });
      }

      if (roleInfo.level < minLevel) {
        console.log(`[ACCESS_LEVEL] Access denied - Required: ${minLevel}, User has: ${roleInfo.level}`);
        return res.status(403).json({ 
          error: `Access level ${minLevel} required. Your level: ${roleInfo.level}` 
        });
      }

      console.log(`[ACCESS_LEVEL] Access granted - Required: ${minLevel}, User has: ${roleInfo.level}`);
      next();
    } catch (error) {
      console.error("[ACCESS_LEVEL] Access level check error:", error);
      return res.status(500).json({ error: "Permission system error" });
    }
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.session?.role;

    if (!userRole) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(userRole)) {
      console.log(`[ROLE_CHECK] Access denied - Role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ 
        error: `Role access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }

    console.log(`[ROLE_CHECK] Role access granted - Role: ${userRole}`);
    next();
  };
};

export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.session?.role;

    if (!userRole) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { roleManagementService } = await import('../services/roleManagementService.ts');
      const roleInfo = roleManagementService.getRoleById(userRole);

      if (!roleInfo) {
        return res.status(403).json({ error: "Invalid role" });
      }

      const hasPermission = roleManagementService.hasPermission(roleInfo, permission);

      if (!hasPermission) {
        console.log(`[PERMISSION] Access denied - Permission: ${permission}, Role: ${userRole}`);
        return res.status(403).json({ 
          error: `Permission denied: ${permission}` 
        });
      }

      console.log(`[PERMISSION] Permission granted - Permission: ${permission}, Role: ${userRole}`);
      next();
    } catch (error) {
      console.error("[PERMISSION] Permission check error:", error);
      return res.status(500).json({ error: "Permission system error" });
    }
  };
};
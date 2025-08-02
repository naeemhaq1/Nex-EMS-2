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

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if session exists
  if (!req.session) {
    console.error('Session not available - middleware not properly configured');
    return res.status(401).json({ error: "Session not configured" });
  }

  const userId = req.session.userId;
  const usernum = req.session.usernum;

  console.log('Auth middleware check - userId:', userId, 'usernum:', usernum);

  // Check if user is authenticated
  if (!userId && !usernum) {
    console.log('Auth middleware - no user ID found in session');
    return res.status(401).json({ error: "Authentication required" });
  }

  // Verify session has required data
  if (!req.session.username || !req.session.role) {
    console.log('Auth middleware - incomplete session data');
    return res.status(401).json({ error: "Invalid session data" });
  }

  console.log('Auth middleware - authentication verified for:', req.session.username);
  next();
};

export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userNum = req.session.usernum;
    const userId = req.session.userId;

    if (!userNum && !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Use usernum (number) if available, otherwise convert userId to number
      const userIdNumber = userNum || (userId ? parseInt(userId, 10) : null);
      if (!userIdNumber) {
        return res.status(401).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userIdNumber);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "User not found or inactive" });
      }

      const rolePermissions = await storage.getRolePermissionByName(user.role);
      if (!rolePermissions) {
        return res.status(403).json({ error: "Role permissions not found" });
      }

      // Check specific permission
      console.log('Permission check:', permission, 'rolePermissions:', rolePermissions);
      const hasPermission = (rolePermissions as any)[permission];
      console.log('hasPermission result:', hasPermission);
      if (!hasPermission) {
        return res.status(403).json({ error: `Permission denied: ${permission}` });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  console.log('Admin middleware - session:', req.session);
  console.log('Admin middleware - role:', req.session.role);
  if ((!req.session.userId && !req.session.usernum) || !['admin', 'superadmin', 'general_admin', 'executive_director', 'general_manager'].includes(req.session.role || '')) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((!req.session.userId && !req.session.usernum) || req.session.role !== 'superadmin') {
    return res.status(403).json({ error: "SuperAdmin access required" });
  }
  next();
};

export const requireManager = (req: Request, res: Response, next: NextFunction) => {
  if ((!req.session.userId && !req.session.usernum) || !['manager', 'assistant_manager', 'supervisor', 'general_manager', 'executive_director', 'superadmin', 'general_admin'].includes(req.session.role || '')) {
    return res.status(403).json({ error: "Manager access required" });
  }
  next();
};

export const requireAccessLevel = (minLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userNum = req.session.usernum;
    const userId = req.session.userId;

    if (!userNum && !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Use usernum (number) if available, otherwise convert userId to number
      const userIdNumber = userNum || (userId ? parseInt(userId, 10) : null);
      if (!userIdNumber) {
        return res.status(401).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userIdNumber);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "User not found or inactive" });
      }

      const rolePermissions = await storage.getRolePermissionByName(user.role);
      if (!rolePermissions || rolePermissions.accessLevel < minLevel) {
        return res.status(403).json({ error: `Access level ${minLevel} required` });
      }

      next();
    } catch (error) {
      console.error("Access level check error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};
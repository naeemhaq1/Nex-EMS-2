
import { Request, Response, NextFunction } from "express";
import session from "express-session";
import { sql } from "../db";

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

// Use memory store for sessions (eliminates database compatibility issues)
export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "nexlinx-ems-session-secret-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
  name: 'nexlinx-session',
  rolling: true,
  // Using default MemoryStore - no database dependency
});

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    console.error('Session not available - middleware not properly configured');
    return res.status(401).json({ error: "Session not configured" });
  }
  
  const sessionId = req.sessionID;
  const userId = req.session.userId;
  const usernum = req.session.usernum;
  
  console.log('Auth middleware - sessionID:', sessionId);
  console.log('Auth middleware - userId:', userId);
  console.log('Auth middleware - usernum:', usernum);
  console.log('Auth middleware - session exists:', !!req.session);
  
  if (!userId && !usernum) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (!sessionId) {
    console.error('Session ID missing - potential security issue');
    return res.status(401).json({ error: "Invalid session" });
  }
  
  if (req.session.userId && req.session.usernum) {
    if (!req.session.username || !req.session.role) {
      console.error('Session data incomplete - potential tampering');
      return res.status(401).json({ error: "Session integrity check failed" });
    }
  }
  
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
      const userIdNumber = userNum || (userId ? parseInt(userId, 10) : null);
      if (!userIdNumber) {
        return res.status(401).json({ error: "Invalid user ID" });
      }
      
      // Direct SQL query instead of using storage service
      const users = await sql`SELECT * FROM users WHERE id = ${userIdNumber} AND "isActive" = true`;
      
      if (users.length === 0) {
        return res.status(401).json({ error: "User not found or inactive" });
      }

      const user = users[0];
      
      // Simple role-based permissions
      const hasPermission = user.role === 'superadmin' || user.role === 'admin';
      
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
      const userIdNumber = userNum || (userId ? parseInt(userId, 10) : null);
      if (!userIdNumber) {
        return res.status(401).json({ error: "Invalid user ID" });
      }
      
      // Direct SQL query instead of using storage service
      const users = await sql`SELECT * FROM users WHERE id = ${userIdNumber} AND "isActive" = true`;
      
      if (users.length === 0) {
        return res.status(401).json({ error: "User not found or inactive" });
      }

      const user = users[0];
      const accessLevel = user.role === 'superadmin' ? 10 : (user.role === 'admin' ? 5 : 1);
      
      if (accessLevel < minLevel) {
        return res.status(403).json({ error: `Access level ${minLevel} required` });
      }

      next();
    } catch (error) {
      console.error("Access level check error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

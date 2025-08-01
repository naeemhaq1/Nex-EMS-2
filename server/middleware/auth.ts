
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sql } from "../db";

// JWT Secret - in production, use a secure environment variable
const JWT_SECRET = process.env.JWT_SECRET || "nexlinx-ems-jwt-secret-2024-secure";
const JWT_EXPIRES_IN = "24h";

// Define role hierarchy with numeric levels for easy comparison
export const ROLE_HIERARCHY = {
  'staff': 1,
  'employee': 2,
  'supervisor': 3,
  'assistant_manager': 4,
  'manager': 5,
  'general_manager': 6,
  'executive_director': 7,
  'admin': 8,
  'general_admin': 9,
  'superadmin': 10
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: UserRole;
        employeeId?: string;
        permissions: UserPermissions;
        roleLevel: number;
      };
    }
  }
}

export interface UserPermissions {
  canCreateUsers: boolean;
  canDeleteUsers: boolean;
  canDeleteData: boolean;
  canAccessFinancialData: boolean;
  canManageSystem: boolean;
  canManageTeams: boolean;
  canChangeDesignations: boolean;
  canAccessAllEmployees: boolean;
  canModifyAttendance: boolean;
  canViewReports: boolean;
  accessLevel: number;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(user: any): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    employeeId: user.employeeId,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(role: UserRole): UserPermissions {
  const roleLevel = ROLE_HIERARCHY[role] || 1;
  
  return {
    canCreateUsers: roleLevel >= ROLE_HIERARCHY.admin,
    canDeleteUsers: roleLevel >= ROLE_HIERARCHY.superadmin,
    canDeleteData: roleLevel >= ROLE_HIERARCHY.superadmin,
    canAccessFinancialData: roleLevel >= ROLE_HIERARCHY.manager,
    canManageSystem: roleLevel >= ROLE_HIERARCHY.admin,
    canManageTeams: roleLevel >= ROLE_HIERARCHY.manager,
    canChangeDesignations: roleLevel >= ROLE_HIERARCHY.admin,
    canAccessAllEmployees: roleLevel >= ROLE_HIERARCHY.manager,
    canModifyAttendance: roleLevel >= ROLE_HIERARCHY.supervisor,
    canViewReports: roleLevel >= ROLE_HIERARCHY.supervisor,
    accessLevel: roleLevel
  };
}

/**
 * Main authentication middleware - validates JWT token
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for JWT token in Authorization header or cookies
    let token: string | undefined;
    
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Fallback to cookie
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: "Authentication required",
        message: "No authentication token provided"
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get fresh user data from database
    const users = await sql`
      SELECT id, username, role, "employeeId", "isActive", "lastPasswordChange"
      FROM users 
      WHERE id = ${decoded.id} AND "isActive" = true
    `;
    
    if (users.length === 0) {
      return res.status(401).json({ 
        error: "User not found or inactive",
        message: "Authentication failed"
      });
    }

    const user = users[0];
    
    // Validate role exists in hierarchy
    if (!(user.role in ROLE_HIERARCHY)) {
      console.error(`Invalid role detected: ${user.role} for user ${user.username}`);
      return res.status(401).json({ 
        error: "Invalid user role",
        message: "Authentication failed"
      });
    }

    // Set user data on request
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      employeeId: user.employeeId,
      permissions: getUserPermissions(user.role as UserRole),
      roleLevel: ROLE_HIERARCHY[user.role as UserRole]
    };

    console.log(`[Auth] User ${user.username} (${user.role}) authenticated successfully`);
    next();
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: "Invalid token",
        message: "Authentication failed"
      });
    }
    
    console.error("Authentication error:", error);
    return res.status(500).json({ 
      error: "Authentication error",
      message: "Internal server error"
    });
  }
};

/**
 * Require minimum role level
 */
export const requireRole = (minRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const requiredLevel = ROLE_HIERARCHY[minRole];
    const userLevel = req.user.roleLevel;
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: "Insufficient permissions",
        message: `Role '${minRole}' or higher required. Current role: '${req.user.role}'`
      });
    }
    
    next();
  };
};

/**
 * Require specific permission
 */
export const requirePermission = (permission: keyof UserPermissions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    if (!req.user.permissions[permission]) {
      return res.status(403).json({ 
        error: "Permission denied",
        message: `Permission '${permission}' required`
      });
    }
    
    next();
  };
};

/**
 * Convenience middleware for common role requirements
 */
export const requireAdmin = requireRole('admin');
export const requireSuperAdmin = requireRole('superadmin');
export const requireManager = requireRole('manager');
export const requireSupervisor = requireRole('supervisor');

/**
 * Session middleware placeholder for backward compatibility
 */
export const sessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Using JWT-based auth instead of sessions
  next();
};

/**
 * Dev mode auto-login middleware (development only)
 */
export const devAutoLogin = async (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: "Not found" });
  }
  
  try {
    // Get or create dev user
    let users = await sql`
      SELECT * FROM users WHERE username = 'dev' AND "isActive" = true
    `;
    
    if (users.length === 0) {
      // Create dev user if doesn't exist
      await sql`
        INSERT INTO users (username, password, role, "isActive", "accountType")
        VALUES ('dev', '$2b$10$dummy.hash.for.dev.user', 'superadmin', true, 'system')
      `;
      
      users = await sql`
        SELECT * FROM users WHERE username = 'dev' AND "isActive" = true
      `;
    }
    
    const user = users[0];
    const token = generateToken(user);
    
    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false, // Allow in development
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token
    });
    
  } catch (error) {
    console.error("Dev auto-login error:", error);
    res.status(500).json({ error: "Dev login failed" });
  }
};

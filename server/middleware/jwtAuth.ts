
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sql } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'nexlinx-ems-jwt-secret-2024';

// Define basic role hierarchy for future expansion
export const ROLES = {
  EMPLOYEE: 'employee',
  SUPERVISOR: 'supervisor', 
  MANAGER: 'manager',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: UserRole;
        employeeId?: string;
        department?: string;
        designation?: string;
      };
    }
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: any): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    employeeId: user.employeeId,
    department: user.department,
    designation: user.designation
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify JWT token and set user in request
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback to cookies
    if (!token && req.cookies?.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication token required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Get fresh user data
    const users = await sql`
      SELECT id, username, role, "employeeId", department, designation, "isActive"
      FROM users 
      WHERE id = ${decoded.userId} AND "isActive" = true
    `;

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found or inactive' 
      });
    }

    const user = users[0];
    
    // Set user in request
    req.user = {
      userId: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId,
      department: user.department,
      designation: user.designation
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid authentication token' 
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
}

/**
 * Require specific role (expandable)
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
}

// Convenience middleware for common roles
export const requireAdmin = requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]);
export const requireSuperAdmin = requireRole([ROLES.SUPERADMIN]);
export const requireManager = requireRole([ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPERADMIN]);
export const requireSupervisor = requireRole([ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPERADMIN]);

/**
 * Dev auto-login for development
 */
export async function devAutoLogin(req: Request, res: Response) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    // Get or create dev user
    let users = await sql`
      SELECT * FROM users WHERE username = 'dev' AND "isActive" = true
    `;

    if (users.length === 0) {
      await sql`
        INSERT INTO users (username, password, role, "isActive")
        VALUES ('dev', '$2b$10$dummy.hash.for.dev', 'superadmin', true)
      `;

      users = await sql`
        SELECT * FROM users WHERE username = 'dev' AND "isActive" = true
      `;
    }

    const user = users[0];
    const token = generateToken(user);

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Dev auto-login error:', error);
    res.status(500).json({ success: false, error: 'Dev login failed' });
  }
}

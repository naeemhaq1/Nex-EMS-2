
import { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: string;
        employeeId?: string;
        department?: string;
        designation?: string;
      };
    }
  }
}

/**
 * JWT Authentication middleware
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = authService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Verify user still exists and is active
    const userResult = await authService.getUserById(decoded.userId);
    if (!userResult.success || !userResult.user) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    // Set user in request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      employeeId: decoded.employeeId,
      department: decoded.department,
      designation: decoded.designation
    };

    next();
  } catch (error) {
    console.error("JWT authentication error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!authService.hasRole(req.user.role, roles)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

/**
 * Access level authorization middleware
 */
export const requireAccessLevel = (minLevel: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!authService.hasAccessLevel(req.user.role, minLevel)) {
      return res.status(403).json({ 
        error: `Access denied. Minimum access level ${minLevel} required` 
      });
    }

    next();
  };
};

/**
 * Admin authorization middleware
 */
export const requireAdmin = requireRole(['admin', 'superadmin']);

/**
 * SuperAdmin authorization middleware
 */
export const requireSuperAdmin = requireRole(['superadmin']);

/**
 * Manager authorization middleware
 */
export const requireManager = requireRole(['manager', 'admin', 'superadmin']);

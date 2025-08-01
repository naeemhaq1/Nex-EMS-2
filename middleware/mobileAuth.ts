import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    employeeCode: string;
    role: string;
    firstName: string;
    lastName: string;
    email?: string;
    department?: string;
    designation?: string;
  };
}

export const mobileAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Get user data
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      employeeCode: user.employeeCode,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department,
      designation: user.designation,
    };

    next();
  } catch (error) {
    console.error('Mobile auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};
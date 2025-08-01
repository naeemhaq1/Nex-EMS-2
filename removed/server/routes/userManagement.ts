import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, employeeRecords, userDevices } from '@shared/schema';
import { eq, and, or, like, isNotNull, desc, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Enhanced user search with employee data
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { search, limit = '10' } = req.query;
    const searchLimit = Math.min(parseInt(limit as string), 10); // Max 10 users

    let query = db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastPasswordChange, // Using existing field as login tracker
        createdAt: users.createdAt,
        employee: {
          id: employeeRecords.id,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          employeeCode: employeeRecords.employeeCode,
          email: employeeRecords.email,
          phone: employeeRecords.phone,
          nonBio: employeeRecords.nonBio,
          stopPay: employeeRecords.stopPay,
          systemAccount: employeeRecords.systemAccount,
          lastSeen: employeeRecords.lasttime,
        }
      })
      .from(users)
      .leftJoin(employeeRecords, eq(users.employeeId, employeeRecords.id))
      .orderBy(desc(users.lastPasswordChange))
      .limit(searchLimit);

    // Apply search filter if provided (minimum 3 characters)
    if (search && typeof search === 'string' && search.length >= 3) {
      const searchTerm = `%${search.toLowerCase()}%`;
      query = query.where(
        or(
          like(sql`LOWER(${users.username})`, searchTerm),
          like(sql`LOWER(${employeeRecords.firstName})`, searchTerm),
          like(sql`LOWER(${employeeRecords.lastName})`, searchTerm),
          like(sql`LOWER(CONCAT(${employeeRecords.firstName}, ' ', ${employeeRecords.lastName}))`, searchTerm),
          like(sql`LOWER(${employeeRecords.department})`, searchTerm),
          like(sql`LOWER(${employeeRecords.employeeCode})`, searchTerm)
        )
      );
    }

    const result = await query;
    res.json(result);
  } catch (error) {
    console.error('[UserManagement] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user account
router.put('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;
    const adminUsername = (req as any).session?.username || 'unknown';

    // Validate user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare user updates
    const userUpdates: any = {};
    if (typeof updates.isActive === 'boolean') {
      userUpdates.isActive = updates.isActive;
    }
    if (updates.role) {
      userUpdates.role = updates.role;
    }

    // Update user table if there are user-specific updates
    if (Object.keys(userUpdates).length > 0) {
      await db
        .update(users)
        .set(userUpdates)
        .where(eq(users.id, userId));
    }

    // Prepare employee updates
    const employeeUpdates: any = {};
    if (typeof updates.nonBio === 'boolean') {
      employeeUpdates.nonBio = updates.nonBio;
    }
    if (typeof updates.stopPay === 'boolean') {
      employeeUpdates.stopPay = updates.stopPay;
    }
    if (typeof updates.systemAccount === 'boolean') {
      employeeUpdates.systemAccount = updates.systemAccount;
    }

    // Update employee table if there are employee-specific updates and user has employee record
    if (Object.keys(employeeUpdates).length > 0 && existingUser.employeeId) {
      await db
        .update(employeeRecords)
        .set(employeeUpdates)
        .where(eq(employeeRecords.id, existingUser.employeeId));
    }

    console.log(`[UserManagement] User ${userId} updated by admin ${adminUsername}:`, { userUpdates, employeeUpdates });
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('[UserManagement] Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Reset user password
router.post('/users/:id/reset-password', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    const adminUsername = (req as any).session?.username || 'unknown';

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log(`[UserManagement] Password reset for user ${userId} by admin ${adminUsername}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('[UserManagement] Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get active sessions with enhanced device information
router.get('/sessions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { search, force = 'false' } = req.query;
    const forceRefresh = force === 'true';

    // This would normally come from session store, but we'll simulate with user devices and last activity
    // In a real implementation, you'd query your session store (Redis, database sessions, etc.)
    
    let query = db
      .select({
        // Simulate session data from user devices and login information
        id: sql`CONCAT('session_', ${userDevices.id})`.as('session_id'),
        userId: users.id,
        username: users.username,
        realName: sql`COALESCE(${employeeRecords.firstName} || ' ' || ${employeeRecords.lastName}, ${users.username})`.as('real_name'),
        role: users.role,
        isActive: users.isActive,
        loginTime: users.lastLoginAt,
        lastActivity: userDevices.lastSeen,
        ipAddress: sql`COALESCE(${userDevices.lastLoginIp}, 'unknown')`.as('ip_address'),
        userAgent: userDevices.userAgent,
        deviceType: userDevices.deviceType,
        browser: userDevices.browser,
        browserVersion: userDevices.browserVersion,
        os: userDevices.operatingSystem,
        osVersion: userDevices.osVersion,
        screenResolution: userDevices.screenResolution,
        timezone: userDevices.timezone,
        // Simulate service status (in real app, this would come from actual permission checks)
        locationEnabled: sql`CASE WHEN ${userDevices.deviceType} = 'mobile' THEN true ELSE false END`.as('location_enabled'),
        notificationEnabled: sql`CASE WHEN ${userDevices.deviceType} = 'mobile' THEN true ELSE false END`.as('notification_enabled'),
      })
      .from(userDevices)
      .innerJoin(users, eq(userDevices.userId, users.id))
      .leftJoin(employeeRecords, eq(users.employeeId, employeeRecords.id))
      .where(
        and(
          eq(users.isActive, true),
          eq(userDevices.isActive, true),
          // Only show sessions from last 24 hours
          sql`${userDevices.lastSeen} > NOW() - INTERVAL '24 hours'`
        )
      )
      .orderBy(desc(userDevices.lastSeen))
      .limit(10);

    // Apply search filter if provided (minimum 3 characters)
    if (search && typeof search === 'string' && search.length >= 3) {
      const searchTerm = `%${search.toLowerCase()}%`;
      query = query.where(
        and(
          eq(users.isActive, true),
          eq(userDevices.isActive, true),
          sql`${userDevices.lastSeen} > NOW() - INTERVAL '24 hours'`,
          or(
            like(sql`LOWER(${users.username})`, searchTerm),
            like(sql`LOWER(${employeeRecords.firstName})`, searchTerm),
            like(sql`LOWER(${employeeRecords.lastName})`, searchTerm),
            like(sql`LOWER(CONCAT(${employeeRecords.firstName}, ' ', ${employeeRecords.lastName}))`, searchTerm)
          )
        )
      );
    }

    const sessions = await query;

    // Calculate session duration and format data
    const formattedSessions = sessions.map(session => {
      const now = new Date();
      const loginTime = new Date(session.loginTime || session.lastActivity);
      const duration = Math.floor((now.getTime() - loginTime.getTime()) / 1000 / 60); // minutes
      
      return {
        ...session,
        loginTime: loginTime.toISOString(),
        lastActivity: session.lastActivity ? new Date(session.lastActivity).toISOString() : loginTime.toISOString(),
        duration: duration > 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`,
        locationEnabled: Boolean(session.locationEnabled),
        notificationEnabled: Boolean(session.notificationEnabled),
      };
    });

    console.log(`[UserManagement] Retrieved ${formattedSessions.length} active sessions${forceRefresh ? ' (forced refresh)' : ''}`);
    res.json(formattedSessions);
  } catch (error) {
    console.error('[UserManagement] Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Force logout user session
router.post('/sessions/:sessionId/logout', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const adminUsername = (req as any).session?.username || 'unknown';

    // Extract device ID from session ID (format: 'session_X')
    const deviceId = sessionId.replace('session_', '');
    
    if (!deviceId || isNaN(parseInt(deviceId))) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    // Get device and user information
    const [device] = await db
      .select({
        id: userDevices.id,
        userId: userDevices.userId,
        username: users.username
      })
      .from(userDevices)
      .innerJoin(users, eq(userDevices.userId, users.id))
      .where(eq(userDevices.id, parseInt(deviceId)))
      .limit(1);

    if (!device) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Mark device as inactive (simulate logout)
    await db
      .update(userDevices)
      .set({ 
        isActive: false,
        notes: `Force logged out by admin ${adminUsername} at ${new Date().toISOString()}`
      })
      .where(eq(userDevices.id, parseInt(deviceId)));

    // In a real session system, you would also:
    // 1. Remove session from session store (Redis/Memory)
    // 2. Invalidate JWT tokens
    // 3. Clear browser cookies (if applicable)

    console.log(`[UserManagement] Session ${sessionId} for user ${device.username} force logged out by admin ${adminUsername}`);
    res.json({ success: true, message: 'User logged out successfully' });
  } catch (error) {
    console.error('[UserManagement] Error forcing logout:', error);
    res.status(500).json({ error: 'Failed to logout user' });
  }
});

export default router;
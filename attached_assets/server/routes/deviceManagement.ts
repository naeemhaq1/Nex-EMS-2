/**
 * Device Management API Routes
 * Handles device authentication and binding controls
 */

import { Router } from 'express';
import { db } from '../db';
import { userDevices, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session?.role || !['admin', 'superadmin', 'general_admin'].includes(req.session.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Check device authentication for login
 * POST /api/device-management/check-auth
 */
router.post('/check-auth', async (req, res) => {
  try {
    const { deviceFingerprint, requestedUserId, userRole } = req.body;

    if (!deviceFingerprint) {
      return res.status(400).json({ error: 'Device fingerprint required' });
    }

    // Check if device is already bound to another user
    const existingDevice = await db
      .select()
      .from(userDevices)
      .where(
        and(
          eq(userDevices.deviceFingerprint, deviceFingerprint),
          eq(userDevices.isActive, true)
        )
      )
      .limit(1);

    // For any login attempt (first time or subsequent), always allow authentication to proceed
    // Device binding restrictions should not block legitimate users
    console.log('🔓 Login device check - allowing authentication (no blocking on first session)');
    return res.json({
      canAuthenticate: true,
      isNewDevice: existingDevice.length === 0,
      device: existingDevice.length > 0 ? existingDevice[0] : null,
      preLoginCheck: true,
      message: 'Device authentication allowed - no first session blocking'
    });

    // Admin users are exempt from device binding restrictions
    if (userRole && ['admin', 'superadmin', 'general_admin'].includes(userRole)) {
      console.log('🔓 Admin user - device binding exemption applied');
      return res.json({
        canAuthenticate: true,
        isNewDevice: existingDevice.length === 0,
        adminExemption: true,
        message: 'Admin account - device data collected but no restrictions applied'
      });
    }

    if (existingDevice.length > 0) {
      const boundDevice = existingDevice[0];
      
      // If requesting same user, allow
      if (requestedUserId && boundDevice.userId === requestedUserId) {
        return res.json({
          canAuthenticate: true,
          isNewDevice: false,
          device: boundDevice
        });
      }

      // If no specific user requested (during login flow), return device info but allow authentication
      // The actual user validation will happen during login
      if (!requestedUserId) {
        return res.json({
          canAuthenticate: true,
          isNewDevice: false,
          device: boundDevice,
          boundUserId: boundDevice.userId,
          message: 'Device is registered - will validate during login'
        });
      }

      // Device is bound to different user - deny access
      return res.status(409).json({
        error: 'Device is already registered with another user',
        canAuthenticate: false,
        isNewDevice: false,
        boundUserId: boundDevice.userId,
        message: 'This device is already bound to another user account. Please use a different device or contact your administrator.'
      });
    }

    // New device - can authenticate
    res.json({
      canAuthenticate: true,
      isNewDevice: true,
      requiresRegistration: true
    });

  } catch (error) {
    console.error('Error checking device authentication:', error);
    res.status(500).json({ 
      error: 'Failed to check device authentication',
      canAuthenticate: false,
      isNewDevice: false
    });
  }
});

/**
 * Register device after successful login
 * POST /api/device-management/register
 */
router.post('/register', async (req, res) => {
  try {
    const { userId, deviceInfo, loginIp, userRole } = req.body;

    if (!userId || !deviceInfo) {
      return res.status(400).json({ error: 'User ID and device info required' });
    }

    // Check if device already exists for this user
    const existingDevice = await db
      .select()
      .from(userDevices)
      .where(
        and(
          eq(userDevices.userId, userId),
          eq(userDevices.deviceFingerprint, deviceInfo.fingerprint)
        )
      )
      .limit(1);

    if (existingDevice.length > 0) {
      // Update existing device
      const updatedDevice = await db
        .update(userDevices)
        .set({
          lastSeen: new Date(),
          lastLoginIp: loginIp,
          loginCount: existingDevice[0].loginCount + 1,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(userDevices.id, existingDevice[0].id))
        .returning();

      return res.json({
        success: true,
        device: updatedDevice[0],
        isNewDevice: false,
        adminExemption: userRole && ['admin', 'superadmin', 'general_admin'].includes(userRole)
      });
    }

    // Create new device record
    const newDevice = await db
      .insert(userDevices)
      .values({
        userId,
        deviceFingerprint: deviceInfo.fingerprint,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        manufacturer: deviceInfo.manufacturer,
        model: deviceInfo.model,
        operatingSystem: deviceInfo.operatingSystem,
        osVersion: deviceInfo.osVersion,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        screenResolution: deviceInfo.screenResolution,
        userAgent: deviceInfo.userAgent,
        platform: deviceInfo.platform,
        language: deviceInfo.language,
        timezone: deviceInfo.timezone,
        macAddress: deviceInfo.macAddress,
        networkInfo: deviceInfo.networkInfo,
        batteryInfo: deviceInfo.batteryInfo,
        hardwareInfo: deviceInfo.hardwareInfo,
        lastLoginIp: loginIp,
        loginCount: 1,
        isActive: true,
        isTrusted: userRole && ['admin', 'superadmin', 'general_admin'].includes(userRole), // Auto-trust admin devices
      })
      .returning();

    res.json({
      success: true,
      device: newDevice[0],
      isNewDevice: true,
      adminExemption: userRole && ['admin', 'superadmin', 'general_admin'].includes(userRole)
    });

  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ 
      error: 'Failed to register device',
      success: false
    });
  }
});

/**
 * Get all user devices (admin only)
 * GET /api/device-management/devices
 */
router.get('/devices', requireAdmin, async (req, res) => {
  try {
    const devices = await db
      .select({
        id: userDevices.id,
        userId: userDevices.userId,
        username: users.username,
        userRole: users.role,
        deviceFingerprint: userDevices.deviceFingerprint,
        deviceName: userDevices.deviceName,
        deviceType: userDevices.deviceType,
        manufacturer: userDevices.manufacturer,
        model: userDevices.model,
        operatingSystem: userDevices.operatingSystem,
        osVersion: userDevices.osVersion,
        browser: userDevices.browser,
        browserVersion: userDevices.browserVersion,
        isActive: userDevices.isActive,
        isTrusted: userDevices.isTrusted,
        firstSeen: userDevices.firstSeen,
        lastSeen: userDevices.lastSeen,
        lastLoginIp: userDevices.lastLoginIp,
        loginCount: userDevices.loginCount,
        notes: userDevices.notes,
        unboundAt: userDevices.unboundAt,
        unboundReason: userDevices.unboundReason,
      })
      .from(userDevices)
      .leftJoin(users, eq(userDevices.userId, users.id))
      .orderBy(userDevices.lastSeen);

    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

/**
 * Unbind device (admin only)
 * POST /api/device-management/unbind/:deviceId
 */
router.post('/unbind/:deviceId', requireAdmin, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { reason } = req.body;
    const adminUserId = req.session.usernum;

    const unboundDevice = await db
      .update(userDevices)
      .set({
        isActive: false,
        unboundAt: new Date(),
        unboundBy: adminUserId,
        unboundReason: reason || 'Unbound by administrator',
        updatedAt: new Date()
      })
      .where(eq(userDevices.id, parseInt(deviceId)))
      .returning();

    if (unboundDevice.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      success: true,
      device: unboundDevice[0],
      message: 'Device successfully unbound'
    });

  } catch (error) {
    console.error('Error unbinding device:', error);
    res.status(500).json({ error: 'Failed to unbind device' });
  }
});

/**
 * Trust/untrust device (admin only)
 * POST /api/device-management/trust/:deviceId
 */
router.post('/trust/:deviceId', requireAdmin, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { trusted, notes } = req.body;

    const updatedDevice = await db
      .update(userDevices)
      .set({
        isTrusted: trusted,
        notes: notes,
        updatedAt: new Date()
      })
      .where(eq(userDevices.id, parseInt(deviceId)))
      .returning();

    if (updatedDevice.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      success: true,
      device: updatedDevice[0],
      message: `Device ${trusted ? 'trusted' : 'untrusted'} successfully`
    });

  } catch (error) {
    console.error('Error updating device trust:', error);
    res.status(500).json({ error: 'Failed to update device trust' });
  }
});

export { router as deviceManagementRouter };
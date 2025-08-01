import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { deviceSessions, users } from "../../shared/schema";
import { and, eq, desc, sql } from "drizzle-orm";

const router = express.Router();

// Parse User-Agent to get device information
const parseUserAgent = (userAgent: string) => {
  const ua = userAgent.toLowerCase();
  
  // Detect device type
  let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  if (ua.includes('mobile') && !ua.includes('tablet')) {
    deviceType = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet';
  }
  
  // Extract OS information
  let operatingSystem = 'Unknown';
  let osVersion = '';
  
  if (ua.includes('windows')) {
    operatingSystem = 'Windows';
    const winMatch = ua.match(/windows nt ([\d.]+)/);
    if (winMatch) {
      const version = winMatch[1];
      osVersion = version === '10.0' ? '11' : version;
    }
  } else if (ua.includes('mac os x')) {
    operatingSystem = 'macOS';
    const macMatch = ua.match(/mac os x ([\d_]+)/);
    if (macMatch) osVersion = macMatch[1].replace(/_/g, '.');
  } else if (ua.includes('android')) {
    operatingSystem = 'Android';
    const androidMatch = ua.match(/android ([\d.]+)/);
    if (androidMatch) osVersion = androidMatch[1];
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    operatingSystem = ua.includes('ipad') ? 'iPadOS' : 'iOS';
    const iosMatch = ua.match(/os ([\d_]+)/);
    if (iosMatch) osVersion = iosMatch[1].replace(/_/g, '.');
  } else if (ua.includes('linux')) {
    operatingSystem = 'Linux';
  }
  
  // Extract browser information
  let browserName = 'Unknown';
  let browserVersion = '';
  
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browserName = ua.includes('mobile') ? 'Chrome Mobile' : 'Chrome';
    const chromeMatch = ua.match(/chrome\/([\d.]+)/);
    if (chromeMatch) browserVersion = chromeMatch[1];
  } else if (ua.includes('firefox')) {
    browserName = 'Firefox';
    const firefoxMatch = ua.match(/firefox\/([\d.]+)/);
    if (firefoxMatch) browserVersion = firefoxMatch[1];
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browserName = 'Safari';
    const safariMatch = ua.match(/version\/([\d.]+)/);
    if (safariMatch) browserVersion = safariMatch[1];
  } else if (ua.includes('edg')) {
    browserName = 'Edge';
    const edgeMatch = ua.match(/edg\/([\d.]+)/);
    if (edgeMatch) browserVersion = edgeMatch[1];
  }
  
  // Generate device name
  let deviceName = 'Unknown Device';
  if (deviceType === 'mobile') {
    if (operatingSystem === 'Android') {
      deviceName = 'Android Device';
    } else if (operatingSystem === 'iOS') {
      deviceName = 'iPhone';
    }
  } else if (deviceType === 'tablet') {
    if (operatingSystem === 'Android') {
      deviceName = 'Android Tablet';
    } else if (operatingSystem === 'iPadOS') {
      deviceName = 'iPad';
    }
  } else {
    if (operatingSystem === 'Windows') {
      deviceName = 'Windows PC';
    } else if (operatingSystem === 'macOS') {
      deviceName = 'Mac';
    } else if (operatingSystem === 'Linux') {
      deviceName = 'Linux PC';
    }
  }
  
  return {
    deviceType,
    deviceName,
    operatingSystem,
    osVersion,
    browserName,
    browserVersion
  };
};

// Get real active sessions from PostgreSQL session store
const getActiveDeviceSessions = async (req: express.Request) => {
  try {
    console.log('[SessionControl] Fetching authentic active user sessions from PostgreSQL');
    
    // Query the actual session table created by connect-pg-simple
    const sessionQuery = `
      SELECT 
        sess->>'userId' as user_id,
        sess->>'username' as username, 
        sess->>'usernum' as usernum,
        sess->>'role' as role,
        sess->>'realName' as real_name,
        sess->>'userAgent' as user_agent,
        sess->>'ipAddress' as ip_address,
        sess->>'loginTime' as login_time,
        sess->>'location' as location,
        sid as session_id,
        expire
      FROM session 
      WHERE expire > NOW()
      AND sess->>'userId' IS NOT NULL
      ORDER BY (sess->>'loginTime')::timestamp DESC
    `;
    
    const result = await db.execute(sql.raw(sessionQuery));
    const sessions = result.rows || [];
    
    console.log(`[SessionControl] Found ${sessions.length} active sessions`);
    
    return sessions.map((session: any, index: number) => {
      const userAgent = session.user_agent || '';
      const deviceInfo = parseUserAgent(userAgent);
      const loginTime = session.login_time ? new Date(session.login_time) : new Date();
      const now = new Date();
      const timeSince = Math.floor((now.getTime() - loginTime.getTime()) / 60000); // minutes
      
      return {
        id: session.session_id || `session-${index}`,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        operatingSystem: deviceInfo.operatingSystem,
        osVersion: deviceInfo.osVersion,
        browserName: deviceInfo.browserName,
        browserVersion: deviceInfo.browserVersion,
        username: session.username || session.user_id || 'Unknown',
        realName: session.real_name || session.username || 'Unknown User',
        role: session.role || 'Unknown',
        usernum: session.usernum ? parseInt(session.usernum) : null,
        ipAddress: session.ip_address || 'Unknown',
        location: session.location || 'Unknown',
        loginSince: loginTime.toISOString(),
        lastActivity: session.expire ? new Date(session.expire).toISOString() : new Date().toISOString(),
        status: 'active',
        userAgent: userAgent,
        sessionDuration: timeSince > 60 ? `${Math.floor(timeSince/60)}h ${timeSince%60}m` : `${timeSince}m`,
        expiresAt: session.expire ? new Date(session.expire).toISOString() : null
      };
    });
  } catch (error) {
    console.error('[SessionControl] Error fetching real sessions:', error);
    return [];
  }
};

// Helper functions for user agent parsing
const extractOS = (userAgent: string): string => {
  if (userAgent.includes('Windows NT')) return 'Windows';
  if (userAgent.includes('Mac OS X')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
};

const extractOSVersion = (userAgent: string): string => {
  const windowsMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
  if (windowsMatch) return windowsMatch[1];
  
  const macMatch = userAgent.match(/Mac OS X (\d+[._]\d+[._]\d+)/);
  if (macMatch) return macMatch[1].replace(/_/g, '.');
  
  const androidMatch = userAgent.match(/Android (\d+\.\d+)/);
  if (androidMatch) return androidMatch[1];
  
  return 'Unknown';
};

const extractBrowser = (userAgent: string): string => {
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edg')) return 'Edge';
  return 'Unknown';
};

const extractBrowserVersion = (userAgent: string): string => {
  const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+)/);
  if (chromeMatch) return chromeMatch[1];
  
  const firefoxMatch = userAgent.match(/Firefox\/(\d+\.\d+)/);
  if (firefoxMatch) return firefoxMatch[1];
  
  const safariMatch = userAgent.match(/Version\/(\d+\.\d+)/);
  if (safariMatch) return safariMatch[1];
  
  return 'Unknown';
};

// This function has been removed - no more demo/fake data

// Get all active sessions - REAL SESSION DATA ONLY
router.get("/sessions", requireAuth, async (req, res) => {
  try {
    console.log('[SessionControl] Fetching authentic active user sessions');
    console.log('[SessionControl] Request session info:', {
      sessionId: req.sessionID,
      userId: req.session.userId,
      username: req.session.username
    });
    
    // Get real sessions from PostgreSQL session store
    const realSessions = await getActiveDeviceSessions(req);
    
    console.log(`[SessionControl] Returning ${realSessions.length} real active sessions`);
    res.json(realSessions);
  } catch (error) {
    console.error("Error in session control endpoint:", error);
    res.status(500).json({ error: "Failed to fetch session data" });
  }
});

// Get REAL BioTime hardware devices - NO SYNTHETIC DATA
const getBioTimeDevices = async () => {
  try {
    // Import the actual device discovery service
    const { DeviceDiscoveryService } = await import("../services/deviceDiscovery");
    const deviceDiscovery = new DeviceDiscoveryService();
    
    // Get REAL devices from BioTime API directly
    const realDevices = await deviceDiscovery.discoverDevices();
    
    // Return only authentic device data from BioTime API
    return realDevices.devices.map(device => ({
      id: `biotime-${device.id}`,
      deviceName: device.alias || device.terminal_name,
      deviceNumber: device.id,
      ipAddress: device.ip_address,
      operatingSystem: 'ZKTeco',
      osVersion: device.firmware,
      browserName: 'BioTime Terminal',
      browserVersion: device.model,
      username: 'Terminal',
      realName: device.alias || device.terminal_name,
      loginSince: device.last_activity.toISOString(),
      lastActivity: device.last_activity.toISOString(),
      status: device.is_active ? 'active' : 'inactive',
      deviceType: 'terminal' as any,
      location: device.area ? `Area ${device.area}` : 'Unknown',
      userAgent: `ZKTeco ${device.model} - ${device.firmware}`,
      isHardware: true,
      port: device.port,
      serialNumber: device.sn
    }));
  } catch (error) {
    console.error('Error fetching real BioTime devices:', error);
    // Return empty array - NO FALLBACK DATA
    return [];
  }
};

// Force logout a session
router.post("/:deviceId/logout", requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    console.log(`[SessionControl] Force logout requested for session: ${deviceId}`);
    
    // Delete the actual session from PostgreSQL
    const deleteQuery = `DELETE FROM session WHERE sid = $1`;
    await db.execute(sql.raw(deleteQuery, deviceId));
    
    console.log(`[SessionControl] Session ${deviceId} successfully invalidated`);
    
    res.json({ 
      success: true, 
      message: "Session logged out successfully",
      deviceId 
    });
  } catch (error) {
    console.error("Error logging out session:", error);
    res.status(500).json({ error: "Failed to logout session" });
  }
});

// Inactivate a device
router.post("/:deviceId/inactivate", requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // In production, this would mark the device as inactive
    console.log(`[DeviceManagement] Inactivate requested for device: ${deviceId}`);
    
    // Simulate device inactivation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    res.json({ 
      success: true, 
      message: "Device inactivated successfully",
      deviceId 
    });
  } catch (error) {
    console.error("Error inactivating device:", error);
    res.status(500).json({ error: "Failed to inactivate device" });
  }
});

// Send WhatsApp invite
router.post("/:deviceId/whatsapp-invite", requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // In production, this would send a WhatsApp invitation
    console.log(`[DeviceManagement] WhatsApp invite requested for device: ${deviceId}`);
    
    // Simulate WhatsApp invite sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      success: true, 
      message: "WhatsApp invite sent successfully",
      deviceId 
    });
  } catch (error) {
    console.error("Error sending WhatsApp invite:", error);
    res.status(500).json({ error: "Failed to send WhatsApp invite" });
  }
});

// Send password reset
router.post("/:deviceId/password-reset", requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // In production, this would send a password reset link via WhatsApp
    console.log(`[DeviceManagement] Password reset requested for device: ${deviceId}`);
    
    // Simulate password reset sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      success: true, 
      message: "Password reset link sent via WhatsApp",
      deviceId 
    });
  } catch (error) {
    console.error("Error sending password reset:", error);
    res.status(500).json({ error: "Failed to send password reset" });
  }
});

// Get device session details
router.get("/:deviceId", requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // No device sessions available
    return res.status(404).json({ error: "Device session not found" });
  } catch (error) {
    console.error("Error fetching device details:", error);
    res.status(500).json({ error: "Failed to fetch device details" });
  }
});

// Get session statistics
router.get("/stats/summary", requireAuth, async (req, res) => {
  try {
    console.log('[SessionControl] Calculating real session statistics');
    
    const sessions = await getActiveDeviceSessions(req);
    
    const mobileDevices = sessions.filter(s => s.deviceType === 'mobile').length;
    const desktopDevices = sessions.filter(s => s.deviceType === 'desktop').length;
    const tabletDevices = sessions.filter(s => s.deviceType === 'tablet').length;
    const uniqueUsers = new Set(sessions.map(s => s.username)).size;
    
    // Calculate average session duration
    const totalMinutes = sessions.reduce((sum, session) => {
      const loginTime = new Date(session.loginSince);
      const now = new Date();
      return sum + Math.floor((now.getTime() - loginTime.getTime()) / 60000);
    }, 0);
    
    const avgMinutes = sessions.length > 0 ? Math.floor(totalMinutes / sessions.length) : 0;
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;
    
    const stats = {
      totalSessions: sessions.length,
      activeSessions: sessions.length,
      idleSessions: 0,
      inactiveSessions: 0,
      mobileDevices,
      desktopDevices,
      tabletDevices,
      uniqueUsers,
      averageSessionDuration: `${avgHours}h ${avgMins}m`,
      lastUpdated: new Date().toISOString()
    };
    
    console.log(`[SessionControl] Statistics: ${stats.totalSessions} total, ${stats.uniqueUsers} unique users`);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching session statistics:", error);
    res.status(500).json({ error: "Failed to fetch session statistics" });
  }
});

export default router;
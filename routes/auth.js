import { Router } from 'express';
import { storage } from '../storage.js';
import bcrypt from 'bcrypt';
import { roleManagementService } from '../services/roleManagementService.ts';

const router = Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 [LOGIN] Login attempt started');

    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log('❌ [LOGIN] Missing username or password');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    console.log(`🔐 [LOGIN] Looking up user: ${username}`);

    // Direct user lookup from storage
    const user = await storage.getUserByUsername(username.trim());

    if (!user) {
      console.log('❌ [LOGIN] User not found');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    console.log('🔐 [LOGIN] User found, verifying password...');
    console.log('🔐 [LOGIN] User details:', {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.password
    });

    // Direct bcrypt comparison
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔐 [LOGIN] Password verification result:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ [LOGIN] Password verification failed');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ [LOGIN] User is inactive');
      return res.status(401).json({ 
        success: false, 
        error: 'Account is inactive' 
      });
    }

    // Validate and enhance role information
    const userRole = user.role || 'staff';
    const roleInfo = roleManagementService.getRoleById(userRole);

    if (!roleInfo) {
      console.log(`⚠️ [LOGIN] Invalid role ${userRole}, defaulting to staff`);
      user.role = 'staff';
    }

    console.log('🔐 [LOGIN] Role validation:', {
      userRole: userRole,
      roleInfo: roleInfo ? {
        id: roleInfo.id,
        name: roleInfo.name,
        level: roleInfo.level,
        permissions: roleInfo.permissions
      } : 'Invalid role'
    });

    // Set comprehensive session with role-based permissions
    req.session.userId = user.id.toString();
    req.session.usernum = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.employeeId = user.employeeId;
    req.session.realName = user.realName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    req.session.loginTime = new Date().toISOString();
    req.session.userAgent = req.headers['user-agent'];
    req.session.ipAddress = req.ip || req.connection.remoteAddress;

    // Set role-based permissions in session
    if (roleInfo) {
      req.session.permissions = {
        canCreateUsers: roleInfo.permissions.includes('user.manage') || roleInfo.permissions.includes('*'),
        canDeleteUsers: roleInfo.canDeleteData || roleInfo.permissions.includes('*'),
        canDeleteData: roleInfo.canDeleteData,
        canAccessFinancialData: roleInfo.permissions.includes('payroll.access') || roleInfo.permissions.includes('*'),
        canManageSystem: roleInfo.permissions.includes('system.configure') || roleInfo.permissions.includes('*'),
        canManageTeams: roleInfo.permissions.includes('team.manage') || roleInfo.permissions.includes('*'),
        canChangeDesignations: roleInfo.canManageRoles || roleInfo.permissions.includes('*'),
        accessLevel: roleInfo.level
      };
    }

    console.log(`✅ [LOGIN] Multi-role login successful for user: ${username}`);
    console.log('✅ [LOGIN] Role: ', user.role);
    console.log('✅ [LOGIN] Permissions: ', req.session.permissions);
    console.log('✅ [LOGIN] Session data set:', {
      userId: req.session.userId,
      usernum: req.session.usernum,
      username: req.session.username,
      role: req.session.role,
      accessLevel: req.session.permissions?.accessLevel
    });

    // Return enhanced user info with role details
    const { password: _, ...userWithoutPassword } = user;
    const responseUser = {
      ...userWithoutPassword,
      roleInfo: roleInfo ? {
        id: roleInfo.id,
        name: roleInfo.name,
        level: roleInfo.level,
        permissions: roleInfo.permissions,
        canManageRoles: roleInfo.canManageRoles,
        accessScope: roleInfo.accessScope
      } : null
    };

    res.json({ 
      success: true, 
      user: responseUser,
      permissions: req.session.permissions
    });

  } catch (error) {
    console.error('💥 [LOGIN] Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during login' 
    });
  }
});

// Check authentication status
router.get('/check', async (req, res) => {
  try {
    console.log('🔍 [AUTH_CHECK] Checking authentication status');
    console.log('🔍 [AUTH_CHECK] Session data:', {
      userId: req.session?.userId,
      username: req.session?.username,
      role: req.session?.role
    });

    if (!req.session?.userId) {
      console.log('❌ [AUTH_CHECK] No session found');
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated - no session' 
      });
    }

    const user = storage.getUserById(parseInt(req.session.userId));

    if (!user) {
      console.log('❌ [AUTH_CHECK] User not found in storage');
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.isActive) {
      console.log('❌ [AUTH_CHECK] User account is inactive');
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        error: 'Account is inactive' 
      });
    }

    console.log(`✅ [AUTH_CHECK] Authentication valid for user: ${user.username}`);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({ 
      success: true, 
      user: userWithoutPassword 
    });

  } catch (error) {
    console.error('💥 [AUTH_CHECK] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during auth check' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  try {
    console.log('🚪 [LOGOUT] Logout request');

    req.session.destroy((err) => {
      if (err) {
        console.error('💥 [LOGOUT] Error destroying session:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Logout failed' 
        });
      }

      res.clearCookie('nexlinx-session');
      console.log('✅ [LOGOUT] Session destroyed successfully');
      res.json({ success: true });
    });
  } catch (error) {
    console.error('💥 [LOGOUT] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

export default router;
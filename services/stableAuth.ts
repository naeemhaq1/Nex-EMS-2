
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, employeeRecords, rolePermissions, userDevices } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface StableUser {
  id: number;
  username: string;
  role: string;
  employeeId?: string;
  employeeCode?: string;
  fullName?: string;
  isActive: boolean;
  isTemporaryPassword: boolean;
  permissions: {
    canCreateUsers: boolean;
    canDeleteUsers: boolean;
    canDeleteData: boolean;
    canAccessFinancialData: boolean;
    canManageSystem: boolean;
    canManageTeams: boolean;
    canChangeDesignations: boolean;
    accessLevel: number;
    managedDepartments: string[];
  };
}

export interface StableAuthResult {
  success: boolean;
  user?: StableUser;
  error?: string;
  requiresPasswordChange?: boolean;
}

export class StableAuthService {
  
  /**
   * Authenticate user with username and password
   */
  async authenticate(username: string, password: string): Promise<StableAuthResult> {
    try {
      console.log(`[StableAuth] Authentication attempt for: ${username}`);
      
      // Find user by username
      const userResult = await db
        .select({
          id: users.id,
          username: users.username,
          password: users.password,
          role: users.role,
          employeeId: users.employeeId,
          isActive: users.isActive,
          isTemporaryPassword: users.isTemporaryPassword,
          managedDepartments: users.managedDepartments,
        })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!userResult[0]) {
        console.log(`[StableAuth] User not found: ${username}`);
        return { success: false, error: 'Invalid credentials' };
      }

      const user = userResult[0];

      // Check if user is active
      if (!user.isActive) {
        console.log(`[StableAuth] User inactive: ${username}`);
        return { success: false, error: 'Account is disabled' };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        console.log(`[StableAuth] Invalid password for: ${username}`);
        return { success: false, error: 'Invalid credentials' };
      }

      // Get role permissions
      const rolePerms = await this.getRolePermissions(user.role);
      if (!rolePerms) {
        console.log(`[StableAuth] Role permissions not found for: ${user.role}`);
        return { success: false, error: 'Role configuration error' };
      }

      // Get employee information if available
      let employeeInfo = null;
      if (user.employeeId) {
        const empResult = await db
          .select({
            employeeCode: employeeRecords.employeeCode,
            firstName: employeeRecords.firstName,
            lastName: employeeRecords.lastName,
            department: employeeRecords.department,
          })
          .from(employeeRecords)
          .where(eq(employeeRecords.employeeCode, user.employeeId))
          .limit(1);
        
        employeeInfo = empResult[0] || null;
      }

      const stableUser: StableUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId || undefined,
        employeeCode: employeeInfo?.employeeCode,
        fullName: employeeInfo ? `${employeeInfo.firstName} ${employeeInfo.lastName}`.trim() : undefined,
        isActive: user.isActive,
        isTemporaryPassword: user.isTemporaryPassword,
        permissions: {
          canCreateUsers: rolePerms.canCreateUsers,
          canDeleteUsers: rolePerms.canDeleteUsers,
          canDeleteData: rolePerms.canDeleteData,
          canAccessFinancialData: rolePerms.canAccessFinancialData,
          canManageSystem: rolePerms.canManageSystem,
          canManageTeams: rolePerms.canManageTeams,
          canChangeDesignations: rolePerms.canChangeDesignations,
          accessLevel: rolePerms.accessLevel,
          managedDepartments: user.managedDepartments || [],
        }
      };

      console.log(`[StableAuth] Authentication successful for: ${username} (Role: ${user.role})`);
      
      return {
        success: true,
        user: stableUser,
        requiresPasswordChange: user.isTemporaryPassword
      };

    } catch (error) {
      console.error('[StableAuth] Authentication error:', error);
      return { success: false, error: 'Authentication system error' };
    }
  }

  /**
   * Get role permissions from database
   */
  private async getRolePermissions(roleName: string) {
    try {
      const result = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleName, roleName))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('[StableAuth] Error getting role permissions:', error);
      return null;
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(user: StableUser, permission: keyof StableUser['permissions']): boolean {
    return user.permissions[permission] as boolean;
  }

  /**
   * Check if user has minimum access level
   */
  hasAccessLevel(user: StableUser, minLevel: number): boolean {
    return user.permissions.accessLevel >= minLevel;
  }

  /**
   * Check if user can access specific department
   */
  canAccessDepartment(user: StableUser, department: string): boolean {
    // SuperAdmin and Admin can access all departments
    if (['superadmin', 'admin'].includes(user.role)) {
      return true;
    }
    
    // Finance can access all departments but with limited permissions
    if (user.role === 'finance') {
      return true;
    }
    
    // Manager/Supervisor can access their managed departments
    if (['manager', 'supervisor'].includes(user.role)) {
      return user.permissions.managedDepartments.includes(department);
    }
    
    // Staff can only access their own department
    return false;
  }

  /**
   * Get user by ID for session validation
   */
  async getUserById(userId: number): Promise<StableUser | null> {
    try {
      const userResult = await db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          employeeId: users.employeeId,
          isActive: users.isActive,
          isTemporaryPassword: users.isTemporaryPassword,
          managedDepartments: users.managedDepartments,
        })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.isActive, true)))
        .limit(1);

      if (!userResult[0]) {
        return null;
      }

      const user = userResult[0];
      const rolePerms = await this.getRolePermissions(user.role);
      
      if (!rolePerms) {
        return null;
      }

      // Get employee information if available
      let employeeInfo = null;
      if (user.employeeId) {
        const empResult = await db
          .select({
            employeeCode: employeeRecords.employeeCode,
            firstName: employeeRecords.firstName,
            lastName: employeeRecords.lastName,
          })
          .from(employeeRecords)
          .where(eq(employeeRecords.employeeCode, user.employeeId))
          .limit(1);
        
        employeeInfo = empResult[0] || null;
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId || undefined,
        employeeCode: employeeInfo?.employeeCode,
        fullName: employeeInfo ? `${employeeInfo.firstName} ${employeeInfo.lastName}`.trim() : undefined,
        isActive: user.isActive,
        isTemporaryPassword: user.isTemporaryPassword,
        permissions: {
          canCreateUsers: rolePerms.canCreateUsers,
          canDeleteUsers: rolePerms.canDeleteUsers,
          canDeleteData: rolePerms.canDeleteData,
          canAccessFinancialData: rolePerms.canAccessFinancialData,
          canManageSystem: rolePerms.canManageSystem,
          canManageTeams: rolePerms.canManageTeams,
          canChangeDesignations: rolePerms.canChangeDesignations,
          accessLevel: rolePerms.accessLevel,
          managedDepartments: user.managedDepartments || [],
        }
      };
    } catch (error) {
      console.error('[StableAuth] Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await db
        .update(users)
        .set({
          password: hashedPassword,
          isTemporaryPassword: false,
          lastPasswordChange: new Date(),
        })
        .where(eq(users.id, userId));
      
      console.log(`[StableAuth] Password changed for user ID: ${userId}`);
      return true;
    } catch (error) {
      console.error('[StableAuth] Error changing password:', error);
      return false;
    }
  }

  /**
   * Create new user (admin only)
   */
  async createUser(
    createdBy: StableUser,
    userData: {
      username: string;
      password: string;
      role: string;
      employeeId?: string;
      managedDepartments?: string[];
    }
  ): Promise<{ success: boolean; error?: string; userId?: number }> {
    try {
      // Check if creator has permission
      if (!this.hasPermission(createdBy, 'canCreateUsers')) {
        return { success: false, error: 'Permission denied' };
      }

      // Validate role hierarchy
      const canCreateRole = await this.canCreateRole(createdBy.role, userData.role);
      if (!canCreateRole) {
        return { success: false, error: 'Cannot create user with this role' };
      }

      // Check if username already exists
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, userData.username))
        .limit(1);

      if (existingUser[0]) {
        return { success: false, error: 'Username already exists' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const result = await db
        .insert(users)
        .values({
          username: userData.username,
          password: hashedPassword,
          role: userData.role,
          employeeId: userData.employeeId,
          managedDepartments: userData.managedDepartments || [],
          isActive: true,
          isTemporaryPassword: true,
        })
        .returning({ id: users.id });

      console.log(`[StableAuth] User created: ${userData.username} by ${createdBy.username}`);
      return { success: true, userId: result[0].id };

    } catch (error) {
      console.error('[StableAuth] Error creating user:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  /**
   * Check if a role can create another role based on hierarchy
   */
  private async canCreateRole(creatorRole: string, targetRole: string): Promise<boolean> {
    try {
      const creatorPerms = await this.getRolePermissions(creatorRole);
      if (!creatorPerms || !creatorPerms.createdRoles) {
        return false;
      }

      return creatorPerms.createdRoles.includes(targetRole);
    } catch (error) {
      console.error('[StableAuth] Error checking role creation permission:', error);
      return false;
    }
  }

  /**
   * Initialize default roles if they don't exist
   */
  async initializeDefaultRoles(): Promise<void> {
    try {
      const defaultRoles = [
        {
          roleName: "superadmin",
          displayName: "Super Administrator",
          description: "Complete system access with all permissions",
          canCreateUsers: true,
          canDeleteUsers: true,
          canDeleteData: true,
          canAccessFinancialData: true,
          canManageSystem: true,
          canManageTeams: true,
          canChangeDesignations: true,
          accessLevel: 100,
          createdRoles: ["admin", "finance", "manager", "supervisor", "staff"]
        },
        {
          roleName: "admin",
          displayName: "Administrator",
          description: "All access cannot make more admins",
          canCreateUsers: true,
          canDeleteUsers: false,
          canDeleteData: true,
          canAccessFinancialData: true,
          canManageSystem: true,
          canManageTeams: true,
          canChangeDesignations: true,
          accessLevel: 80,
          createdRoles: ["finance", "manager", "supervisor", "staff"]
        },
        {
          roleName: "finance",
          displayName: "Finance Officer",
          description: "Has access to all data but cannot delete",
          canCreateUsers: false,
          canDeleteUsers: false,
          canDeleteData: false,
          canAccessFinancialData: true,
          canManageSystem: false,
          canManageTeams: false,
          canChangeDesignations: false,
          accessLevel: 60,
          createdRoles: []
        },
        {
          roleName: "manager",
          displayName: "Manager",
          description: "Has access to the departments he is part of",
          canCreateUsers: false,
          canDeleteUsers: false,
          canDeleteData: false,
          canAccessFinancialData: false,
          canManageSystem: false,
          canManageTeams: true,
          canChangeDesignations: false,
          accessLevel: 50,
          createdRoles: ["supervisor", "staff"]
        },
        {
          roleName: "supervisor",
          displayName: "Supervisor",
          description: "Same as manager with only team management",
          canCreateUsers: false,
          canDeleteUsers: false,
          canDeleteData: false,
          canAccessFinancialData: false,
          canManageSystem: false,
          canManageTeams: true,
          canChangeDesignations: false,
          accessLevel: 40,
          createdRoles: ["staff"]
        },
        {
          roleName: "staff",
          displayName: "Staff",
          description: "Normal - Only access to own info",
          canCreateUsers: false,
          canDeleteUsers: false,
          canDeleteData: false,
          canAccessFinancialData: false,
          canManageSystem: false,
          canManageTeams: false,
          canChangeDesignations: false,
          accessLevel: 20,
          createdRoles: []
        }
      ];

      for (const role of defaultRoles) {
        const existing = await db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleName, role.roleName))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(rolePermissions).values(role);
          console.log(`[StableAuth] Created role: ${role.displayName}`);
        }
      }

      console.log('[StableAuth] Default roles initialization complete');
    } catch (error) {
      console.error('[StableAuth] Error initializing default roles:', error);
    }
  }
}

export const stableAuthService = new StableAuthService();

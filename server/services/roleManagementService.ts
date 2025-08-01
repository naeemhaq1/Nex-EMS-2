
import { db, sql } from '../db';
import { users, employeeRecords, rolePermissions } from '@shared/schema';
import { eq, and, or, like, desc } from 'drizzle-orm';

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  accessLevel: number;
  permissions: {
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
    canManageRoles: boolean;
    canManageDevices: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleAssignment {
  userId: number;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  accessScope: 'global' | 'department' | 'location' | 'specialized';
  departmentRestrictions?: string[];
  locationRestrictions?: string[];
  specializedAccess?: string[];
}

export class RoleManagementService {
  
  /**
   * Get all available roles
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      const roles = await sql`
        SELECT * FROM role_permissions 
        WHERE "isActive" = true 
        ORDER BY "accessLevel" DESC, "displayName" ASC
      `;
      
      return roles.map(role => ({
        id: role.roleId,
        name: role.roleId,
        displayName: role.displayName,
        description: role.description,
        accessLevel: role.accessLevel,
        permissions: {
          canCreateUsers: role.canCreateUsers,
          canDeleteUsers: role.canDeleteUsers,
          canDeleteData: role.canDeleteData,
          canAccessFinancialData: role.canAccessFinancialData,
          canManageSystem: role.canManageSystem,
          canManageTeams: role.canManageTeams,
          canChangeDesignations: role.canChangeDesignations,
          canAccessAllEmployees: role.canAccessAllEmployees,
          canModifyAttendance: role.canModifyAttendance,
          canViewReports: role.canViewReports,
          canManageRoles: role.canManageRoles,
          canManageDevices: role.canManageDevices,
        },
        isActive: role.isActive,
        createdAt: new Date(role.createdAt),
        updatedAt: new Date(role.updatedAt),
      }));
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw new Error('Failed to fetch roles');
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<Role | null> {
    try {
      const [role] = await sql`
        SELECT * FROM role_permissions 
        WHERE "roleId" = ${roleId} AND "isActive" = true
      `;

      if (!role) return null;

      return {
        id: role.roleId,
        name: role.roleId,
        displayName: role.displayName,
        description: role.description,
        accessLevel: role.accessLevel,
        permissions: {
          canCreateUsers: role.canCreateUsers,
          canDeleteUsers: role.canDeleteUsers,
          canDeleteData: role.canDeleteData,
          canAccessFinancialData: role.canAccessFinancialData,
          canManageSystem: role.canManageSystem,
          canManageTeams: role.canManageTeams,
          canChangeDesignations: role.canChangeDesignations,
          canAccessAllEmployees: role.canAccessAllEmployees,
          canModifyAttendance: role.canModifyAttendance,
          canViewReports: role.canViewReports,
          canManageRoles: role.canManageRoles,
          canManageDevices: role.canManageDevices,
        },
        isActive: role.isActive,
        createdAt: new Date(role.createdAt),
        updatedAt: new Date(role.updatedAt),
      };
    } catch (error) {
      console.error('Error fetching role:', error);
      return null;
    }
  }

  /**
   * Assign role to user
   */
  async assignUserRole(
    userId: number, 
    roleId: string, 
    assignedBy: string,
    accessScope: 'global' | 'department' | 'location' | 'specialized' = 'global',
    restrictions?: {
      departments?: string[];
      locations?: string[];
      specializedAccess?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate role exists
      const role = await this.getRoleById(roleId);
      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      // Validate user exists
      const [user] = await sql`
        SELECT id FROM users WHERE id = ${userId} AND "isActive" = true
      `;
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Update user role
      await sql`
        UPDATE users 
        SET role = ${roleId}, 
            "updatedAt" = NOW(),
            "managedDepartments" = ${restrictions?.departments || []},
            "accessScope" = ${accessScope}
        WHERE id = ${userId}
      `;

      // Log the assignment
      await sql`
        INSERT INTO role_assignment_log (
          "userId", "roleId", "assignedBy", "assignedAt", 
          "accessScope", "departmentRestrictions", "locationRestrictions", "specializedAccess"
        ) VALUES (
          ${userId}, ${roleId}, ${assignedBy}, NOW(),
          ${accessScope}, ${restrictions?.departments || []}, 
          ${restrictions?.locations || []}, ${restrictions?.specializedAccess || []}
        )
      `;

      return { success: true };
    } catch (error) {
      console.error('Error assigning role:', error);
      return { success: false, error: 'Failed to assign role' };
    }
  }

  /**
   * Remove role from user
   */
  async removeUserRole(userId: number, removedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      const [user] = await sql`
        SELECT id, role FROM users WHERE id = ${userId} AND "isActive" = true
      `;
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Set role to basic employee
      await sql`
        UPDATE users 
        SET role = 'employee', 
            "updatedAt" = NOW(),
            "managedDepartments" = '[]',
            "accessScope" = 'global'
        WHERE id = ${userId}
      `;

      // Log the removal
      await sql`
        INSERT INTO role_assignment_log (
          "userId", "roleId", "assignedBy", "assignedAt", 
          "accessScope", "action"
        ) VALUES (
          ${userId}, ${user.role}, ${removedBy}, NOW(),
          'global', 'removed'
        )
      `;

      return { success: true };
    } catch (error) {
      console.error('Error removing role:', error);
      return { success: false, error: 'Failed to remove role' };
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(roleId: string): Promise<any[]> {
    try {
      const users = await sql`
        SELECT 
          u.id,
          u.username,
          u.role,
          u."isActive",
          u."accessScope",
          u."managedDepartments",
          u."createdAt",
          e."firstName",
          e."lastName",
          e.department,
          e.designation,
          e."employeeCode"
        FROM users u
        LEFT JOIN employee_records e ON u."employeeId" = e."employeeCode"
        WHERE u.role = ${roleId} AND u."isActive" = true
        ORDER BY e."firstName", e."lastName"
      `;

      return users;
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }

  /**
   * Get role statistics
   */
  async getRoleStatistics(): Promise<any> {
    try {
      const stats = await sql`
        SELECT 
          role,
          COUNT(*) as user_count,
          COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_users,
          COUNT(CASE WHEN "lastPasswordChange" > NOW() - INTERVAL '30 days' THEN 1 END) as recent_logins
        FROM users 
        WHERE "isActive" = true
        GROUP BY role
        ORDER BY user_count DESC
      `;

      const totalUsers = await sql`
        SELECT COUNT(*) as total FROM users WHERE "isActive" = true
      `;

      return {
        roleDistribution: stats,
        totalActiveUsers: totalUsers[0]?.total || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching role statistics:', error);
      return { roleDistribution: [], totalActiveUsers: 0, lastUpdated: new Date().toISOString() };
    }
  }

  /**
   * Validate user permissions for action
   */
  async validateUserPermission(userId: number, permission: string): Promise<boolean> {
    try {
      const [user] = await sql`
        SELECT u.role, rp.*
        FROM users u
        LEFT JOIN role_permissions rp ON u.role = rp."roleId"
        WHERE u.id = ${userId} AND u."isActive" = true
      `;

      if (!user) return false;

      // Check if the role has the requested permission
      return user[permission] === true;
    } catch (error) {
      console.error('Error validating permission:', error);
      return false;
    }
  }

  /**
   * Get role assignment history for user
   */
  async getUserRoleHistory(userId: number): Promise<any[]> {
    try {
      const history = await sql`
        SELECT 
          ral.*,
          rp."displayName" as "roleDisplayName"
        FROM role_assignment_log ral
        LEFT JOIN role_permissions rp ON ral."roleId" = rp."roleId"
        WHERE ral."userId" = ${userId}
        ORDER BY ral."assignedAt" DESC
        LIMIT 20
      `;

      return history;
    } catch (error) {
      console.error('Error fetching role history:', error);
      return [];
    }
  }
}

export const roleManagementService = new RoleManagementService();

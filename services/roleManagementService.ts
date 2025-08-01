
import { db } from "../db";
import { rolePermissions, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface CreateRoleRequest {
  roleName: string;
  displayName: string;
  description: string;
  canCreateUsers: boolean;
  canDeleteUsers: boolean;
  canDeleteData: boolean;
  canAccessFinancialData: boolean;
  canManageSystem: boolean;
  canManageTeams: boolean;
  canChangeDesignations: boolean;
  accessLevel: number;
  createdRoles: string[];
}

export class RoleManagementService {
  /**
   * Create a new role dynamically
   */
  async createRole(roleData: CreateRoleRequest, createdBy: number): Promise<{ success: boolean; message: string }> {
    try {
      // Check if role already exists
      const existingRole = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleName, roleData.roleName))
        .limit(1);

      if (existingRole.length > 0) {
        return { success: false, message: "Role already exists" };
      }

      // Validate access level (1-100)
      if (roleData.accessLevel < 1 || roleData.accessLevel > 100) {
        return { success: false, message: "Access level must be between 1 and 100" };
      }

      // Create the role
      await db.insert(rolePermissions).values({
        ...roleData,
        createdRoles: roleData.createdRoles
      });

      console.log(`[Role Management] New role created: ${roleData.displayName} by user ${createdBy}`);
      return { success: true, message: "Role created successfully" };
    } catch (error) {
      console.error("[Role Management] Error creating role:", error);
      return { success: false, message: "Failed to create role" };
    }
  }

  /**
   * Update an existing role
   */
  async updateRole(roleName: string, updates: Partial<CreateRoleRequest>, updatedBy: number): Promise<{ success: boolean; message: string }> {
    try {
      const existingRole = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleName, roleName))
        .limit(1);

      if (existingRole.length === 0) {
        return { success: false, message: "Role not found" };
      }

      // Validate access level if provided
      if (updates.accessLevel && (updates.accessLevel < 1 || updates.accessLevel > 100)) {
        return { success: false, message: "Access level must be between 1 and 100" };
      }

      await db
        .update(rolePermissions)
        .set(updates)
        .where(eq(rolePermissions.roleName, roleName));

      console.log(`[Role Management] Role updated: ${roleName} by user ${updatedBy}`);
      return { success: true, message: "Role updated successfully" };
    } catch (error) {
      console.error("[Role Management] Error updating role:", error);
      return { success: false, message: "Failed to update role" };
    }
  }

  /**
   * Get all available roles
   */
  async getAllRoles(): Promise<any[]> {
    try {
      return await db.select().from(rolePermissions);
    } catch (error) {
      console.error("[Role Management] Error fetching roles:", error);
      return [];
    }
  }

  /**
   * Get role hierarchy (what roles can create what)
   */
  async getRoleHierarchy(): Promise<any> {
    try {
      const roles = await this.getAllRoles();
      const hierarchy: { [key: string]: string[] } = {};
      
      roles.forEach(role => {
        hierarchy[role.roleName] = role.createdRoles || [];
      });
      
      return hierarchy;
    } catch (error) {
      console.error("[Role Management] Error fetching role hierarchy:", error);
      return {};
    }
  }

  /**
   * Check if a role can create another role
   */
  async canRoleCreate(parentRole: string, targetRole: string): Promise<boolean> {
    try {
      const role = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleName, parentRole))
        .limit(1);

      if (role.length === 0) return false;
      
      return role[0].createdRoles?.includes(targetRole) || false;
    } catch (error) {
      console.error("[Role Management] Error checking role creation permission:", error);
      return false;
    }
  }
}

export const roleManagementService = new RoleManagementService();

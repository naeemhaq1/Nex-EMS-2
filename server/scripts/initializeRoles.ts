import { db } from "../db";
import { rolePermissions } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function initializeDefaultRoles() {
  console.log("Initializing default role permissions...");

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
      createdRoles: ["general_admin", "manager", "assistant_manager", "finance", "employee"]
    },
    {
      roleName: "general_admin",
      displayName: "General Administrator",
      description: "Full administrative access with some restrictions",
      canCreateUsers: true,
      canDeleteUsers: false,
      canDeleteData: false,
      canAccessFinancialData: true,
      canManageSystem: true,
      canManageTeams: true,
      canChangeDesignations: true,
      accessLevel: 80,
      createdRoles: ["manager", "assistant_manager", "employee"]
    },
    {
      roleName: "manager",
      displayName: "Manager",
      description: "Team management and departmental oversight",
      canCreateUsers: false,
      canDeleteUsers: false,
      canDeleteData: false,
      canAccessFinancialData: false,
      canManageSystem: false,
      canManageTeams: true,
      canChangeDesignations: false,
      accessLevel: 60,
      createdRoles: ["assistant_manager", "employee"]
    },
    {
      roleName: "assistant_manager",
      displayName: "Assistant Manager",
      description: "Limited management capabilities",
      canCreateUsers: false,
      canDeleteUsers: false,
      canDeleteData: false,
      canAccessFinancialData: false,
      canManageSystem: false,
      canManageTeams: false,
      canChangeDesignations: false,
      accessLevel: 40,
      createdRoles: ["employee"]
    },
    {
      roleName: "finance",
      displayName: "Finance Officer",
      description: "Financial data access and reporting",
      canCreateUsers: false,
      canDeleteUsers: false,
      canDeleteData: false,
      canAccessFinancialData: true,
      canManageSystem: false,
      canManageTeams: false,
      canChangeDesignations: false,
      accessLevel: 50,
      createdRoles: []
    },
    {
      roleName: "employee",
      displayName: "Employee",
      description: "Basic employee portal access",
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
    // Check if role already exists
    const existing = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleName, role.roleName))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(rolePermissions).values({
        ...role,
        createdRoles: role.createdRoles
      });
      console.log(`Created role: ${role.displayName}`);
    } else {
      console.log(`Role already exists: ${role.displayName}`);
    }
  }

  console.log("Default roles initialization complete!");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDefaultRoles().catch(console.error);
}
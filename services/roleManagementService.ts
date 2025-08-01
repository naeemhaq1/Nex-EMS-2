
export interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  permissions: string[];
  canManageRoles: boolean;
  canDeleteData: boolean;
  accessScope: 'global' | 'department' | 'location' | 'team';
  managedDepartments?: string[];
  managedLocations?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  userId: number;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  isActive: boolean;
  scope?: string;
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

export class RoleManagementService {
  private static instance: RoleManagementService;
  
  // Predefined system roles with flexibility for future expansion
  private static readonly SYSTEM_ROLES: Role[] = [
    {
      id: 'superadmin',
      name: 'Super Admin',
      description: 'Complete system access with ability to create more admins',
      level: 10,
      permissions: ['*'],
      canManageRoles: true,
      canDeleteData: true,
      accessScope: 'global',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'All access except creating more admins',
      level: 9,
      permissions: ['user.manage', 'data.read', 'data.write', 'system.configure'],
      canManageRoles: false,
      canDeleteData: false,
      accessScope: 'global',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'finance',
      name: 'Finance',
      description: 'Access to all data but cannot delete',
      level: 7,
      permissions: ['data.read', 'reports.generate', 'payroll.access'],
      canManageRoles: false,
      canDeleteData: false,
      accessScope: 'global',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'manager',
      name: 'Manager',
      description: 'Access to assigned departments with team management',
      level: 6,
      permissions: ['team.manage', 'data.read', 'data.write', 'reports.generate'],
      canManageRoles: false,
      canDeleteData: false,
      accessScope: 'department',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'supervisor',
      name: 'Supervisor',
      description: 'Team management within assigned departments',
      level: 5,
      permissions: ['team.manage', 'data.read', 'attendance.manage'],
      canManageRoles: false,
      canDeleteData: false,
      accessScope: 'team',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'staff',
      name: 'Staff',
      description: 'Access to own information only',
      level: 1,
      permissions: ['self.read', 'self.update'],
      canManageRoles: false,
      canDeleteData: false,
      accessScope: 'location',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  public static getInstance(): RoleManagementService {
    if (!RoleManagementService.instance) {
      RoleManagementService.instance = new RoleManagementService();
    }
    return RoleManagementService.instance;
  }

  private constructor() {}

  /**
   * Get all available roles
   */
  public getAllRoles(): Role[] {
    return [...RoleManagementService.SYSTEM_ROLES];
  }

  /**
   * Get role by ID
   */
  public getRoleById(roleId: string): Role | null {
    return RoleManagementService.SYSTEM_ROLES.find(role => role.id === roleId) || null;
  }

  /**
   * Check if user has permission
   */
  public hasPermission(userRole: Role, permission: string): boolean {
    if (userRole.permissions.includes('*')) {
      return true;
    }
    return userRole.permissions.includes(permission);
  }

  /**
   * Get roles that can be assigned by current user
   */
  public getAssignableRoles(currentUserRole: Role): Role[] {
    if (currentUserRole.id === 'superadmin') {
      return this.getAllRoles();
    }
    
    if (currentUserRole.canManageRoles) {
      return this.getAllRoles().filter(role => role.level < currentUserRole.level);
    }
    
    return [];
  }

  /**
   * Validate role assignment
   */
  public canAssignRole(assignerRole: Role, targetRole: Role): boolean {
    // SuperAdmin can assign any role
    if (assignerRole.id === 'superadmin') {
      return true;
    }
    
    // Only users with role management permission can assign roles
    if (!assignerRole.canManageRoles) {
      return false;
    }
    
    // Cannot assign roles of equal or higher level
    return targetRole.level < assignerRole.level;
  }

  /**
   * Create custom role (for future expansion)
   */
  public createCustomRole(roleData: Partial<Role>, createdBy: string): Role {
    const newRole: Role = {
      id: `custom_${Date.now()}`,
      name: roleData.name || 'Custom Role',
      description: roleData.description || '',
      level: roleData.level || 3,
      permissions: roleData.permissions || ['data.read'],
      canManageRoles: false,
      canDeleteData: false,
      accessScope: roleData.accessScope || 'department',
      managedDepartments: roleData.managedDepartments,
      managedLocations: roleData.managedLocations,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // In a real implementation, this would be saved to database
    console.log(`Custom role created by ${createdBy}:`, newRole);
    
    return newRole;
  }

  /**
   * Get role hierarchy for display
   */
  public getRoleHierarchy(): Role[] {
    return this.getAllRoles().sort((a, b) => b.level - a.level);
  }

  /**
   * Get permissions by category
   */
  public getPermissionCategories(): Record<string, Permission[]> {
    const permissions: Permission[] = [
      { id: '*', name: 'All Permissions', category: 'System', description: 'Complete system access' },
      { id: 'user.manage', name: 'User Management', category: 'Users', description: 'Create and manage user accounts' },
      { id: 'data.read', name: 'Data Read', category: 'Data', description: 'Read access to system data' },
      { id: 'data.write', name: 'Data Write', category: 'Data', description: 'Write access to system data' },
      { id: 'data.delete', name: 'Data Delete', category: 'Data', description: 'Delete access to system data' },
      { id: 'team.manage', name: 'Team Management', category: 'Teams', description: 'Manage team members and assignments' },
      { id: 'reports.generate', name: 'Generate Reports', category: 'Reports', description: 'Create and export reports' },
      { id: 'payroll.access', name: 'Payroll Access', category: 'Finance', description: 'Access payroll information' },
      { id: 'attendance.manage', name: 'Attendance Management', category: 'Attendance', description: 'Manage attendance records' },
      { id: 'system.configure', name: 'System Configuration', category: 'System', description: 'Configure system settings' },
      { id: 'self.read', name: 'Self Read', category: 'Personal', description: 'Read own information' },
      { id: 'self.update', name: 'Self Update', category: 'Personal', description: 'Update own information' }
    ];

    return permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }
}

export const roleManagementService = RoleManagementService.getInstance();

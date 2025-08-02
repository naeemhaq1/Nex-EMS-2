interface Role {
  id: string;
  name: string;
  level: number;
  permissions: string[];
  canManageRoles: boolean;
  canDeleteData: boolean;
  accessScope: string;
}

class RoleManagementService {
  private roles: Map<string, Role> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles() {
    const defaultRoles: Role[] = [
      {
        id: 'superadmin',
        name: 'Super Administrator',
        level: 100,
        permissions: ['*'],
        canManageRoles: true,
        canDeleteData: true,
        accessScope: 'global'
      },
      {
        id: 'admin',
        name: 'Administrator',
        level: 90,
        permissions: [
          'user.manage',
          'system.configure',
          'data.read',
          'data.write',
          'reports.access',
          'attendance.manage',
          'employee.manage'
        ],
        canManageRoles: true,
        canDeleteData: true,
        accessScope: 'organization'
      },
      {
        id: 'general_admin',
        name: 'General Administrator',
        level: 80,
        permissions: [
          'user.create',
          'data.read',
          'data.write',
          'reports.access',
          'attendance.view',
          'employee.view'
        ],
        canManageRoles: false,
        canDeleteData: false,
        accessScope: 'department'
      },
      {
        id: 'manager',
        name: 'Manager',
        level: 70,
        permissions: [
          'team.manage',
          'data.read',
          'reports.access',
          'attendance.view',
          'employee.view'
        ],
        canManageRoles: false,
        canDeleteData: false,
        accessScope: 'team'
      },
      {
        id: 'hr',
        name: 'Human Resources',
        level: 60,
        permissions: [
          'employee.manage',
          'payroll.access',
          'data.read',
          'reports.access'
        ],
        canManageRoles: false,
        canDeleteData: false,
        accessScope: 'organization'
      },
      {
        id: 'employee',
        name: 'Employee',
        level: 10,
        permissions: [
          'profile.view',
          'attendance.self'
        ],
        canManageRoles: false,
        canDeleteData: false,
        accessScope: 'self'
      },
      {
        id: 'staff',
        name: 'Staff',
        level: 20,
        permissions: [
          'profile.view',
          'attendance.self',
          'basic.access'
        ],
        canManageRoles: false,
        canDeleteData: false,
        accessScope: 'self'
      }
    ];

    defaultRoles.forEach(role => {
      this.roles.set(role.id, role);
    });

    console.log(`✅ Initialized ${this.roles.size} default roles`);
  }

  getRoleById(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  hasPermission(roleId: string, permission: string): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;

    // Superuser permissions
    if (role.permissions.includes('*')) return true;

    // Specific permission
    return role.permissions.includes(permission);
  }

  canAccessLevel(userRoleId: string, requiredLevel: number): boolean {
    const role = this.roles.get(userRoleId);
    return role ? role.level >= requiredLevel : false;
  }

  isAdmin(roleId: string): boolean {
    return ['superadmin', 'admin', 'general_admin'].includes(roleId);
  }

  isEmployee(roleId: string): boolean {
    return ['employee', 'staff'].includes(roleId);
  }
}

export const roleManagementService = new RoleManagementService();
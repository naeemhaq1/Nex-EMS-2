interface User {
  id: number;
  username: string;
  role: string;
  permissions: string[];
}

interface Role {
  name: string;
  permissions: string[];
}

export class RoleManagementService {
  private users: User[] = [
    {
      id: 1,
      username: 'test',
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'admin']
    }
  ];

  private roles: Role[] = [
    {
      name: 'admin',
      permissions: ['read', 'write', 'delete', 'admin']
    },
    {
      name: 'employee',
      permissions: ['read']
    },
    {
      name: 'manager',
      permissions: ['read', 'write']
    }
  ];

  getUserByUsername(username: string): User | undefined {
    return this.users.find(user => user.username === username);
  }

  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  hasPermission(userId: number, permission: string): boolean {
    const user = this.getUserById(userId);
    return user ? user.permissions.includes(permission) : false;
  }

  getRoles(): Role[] {
    return this.roles;
  }

  addUser(username: string, role: string): User {
    const roleObj = this.roles.find(r => r.name === role);
    const newUser: User = {
      id: this.users.length + 1,
      username,
      role,
      permissions: roleObj ? roleObj.permissions : ['read']
    };

    this.users.push(newUser);
    return newUser;
  }
}

export const roleManagement = new RoleManagementService();
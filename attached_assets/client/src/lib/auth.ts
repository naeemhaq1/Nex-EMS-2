import { apiRequest } from "./queryClient";
import type { User, LoginCredentials } from "@shared/schema";

export interface AuthResult {
  success: boolean;
  user?: User;
  message?: string;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      const data = await response.json();
      
      if (data.success) {
        this.currentUser = data.user;
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Login failed" 
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.currentUser = null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const response = await apiRequest("GET", "/api/auth/me");
      const data = await response.json();
      this.currentUser = data.user;
      return data.user;
    } catch (error) {
      this.currentUser = null;
      return null;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const response = await apiRequest("POST", "/api/auth/refresh");
      const data = await response.json();
      
      if (data.success) {
        this.currentUser = data.user;
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === "admin";
  }

  getUser(): User | null {
    return this.currentUser;
  }

  getUserRole(): string {
    return this.currentUser?.role || "guest";
  }

  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    
    // Admin has all permissions
    if (this.currentUser.role === "admin") return true;
    
    // Define employee permissions
    const employeePermissions = [
      "view_own_attendance",
      "view_own_profile",
      "update_own_profile",
    ];
    
    // Check if employee has the specific permission
    if (this.currentUser.role === "employee") {
      return employeePermissions.includes(permission);
    }
    
    return false;
  }
}

export const authService = AuthService.getInstance();

// Auth utility functions
export const requireAuth = () => {
  if (!authService.isAuthenticated()) {
    throw new Error("Authentication required");
  }
};

export const requireAdmin = () => {
  requireAuth();
  if (!authService.isAdmin()) {
    throw new Error("Admin access required");
  }
};

export const checkPermission = (permission: string) => {
  if (!authService.hasPermission(permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
};

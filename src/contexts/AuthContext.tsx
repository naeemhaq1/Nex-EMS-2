import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    requiresPasswordChange?: boolean;
    userId?: number;
  }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Dev mode toggle: Auto-login only in development environment
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    if (isDevelopment) {
      // Development mode: Immediate auto-login
      console.log('DEV MODE: Attempting immediate auto-login...');
      attemptAutoLogin();
    } else {
      // Production mode: Check existing auth without auto-login
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Checking authentication status...');
      
      // Fast session check with reduced timeout for quick dashboard loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Increased timeout for stability

      const response = await fetch('/api/stable-auth/me', {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('Auth check successful:', data);
        
        if (data && data.id) {
          setUser(data);
          localStorage.setItem('auth-state', JSON.stringify({
            authenticated: true,
            userId: data.id,
            timestamp: Date.now()
          }));
        } else {
          console.log('Empty user data received');
          setUser(null);
        }
      } else {
        console.log('Auth check failed with status:', response.status);
        setUser(null);
        
        // Clear any stale auth state
        localStorage.removeItem('auth-state');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Auth check timeout - continuing gracefully');
      } else {
        console.error('Auth check failed:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const attemptAutoLogin = async () => {
    try {
      console.log('Auto-login: Attempting immediate dev auto-login');

      const response = await fetch('/api/stable-auth/dev/auto-login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Fast-Login': 'true',
          'X-Mobile-Compatible': 'true'
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Auto-login successful:', data);
        if (data.success && data.user) {
          setUser(data.user);
          console.log('User set in context:', data.user);
        }
      } else {
        console.log('Auto-login failed with status:', response.status);
        setUser(null);
      }
    } catch (error: any) {
      console.error('Auto-login error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log('Attempting login for user:', username);
      
      const response = await fetch('/api/stable-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok && data.success) {
        console.log('Login successful, setting user:', data.user);
        setUser(data.user);
        setLoading(false);
        return { success: true };
      } else {
        console.log('Login failed:', data.error);
        return { 
          success: false, 
          error: data.error || 'Login failed',
          requiresPasswordChange: data.requiresPasswordChange,
          userId: data.userId
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error occurred. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      // Clear user state immediately
      setUser(null);

      // Clear any cached authentication data
      localStorage.clear();
      sessionStorage.clear();

      // Call logout endpoint with cache-busting
      const response = await fetch('/api/stable-auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Add cache-busting timestamp to prevent browser caching and go to login
          const timestamp = Date.now();
          window.location.replace(`/login?logout=${timestamp}`);
        } else {
          console.error('Logout failed:', result.error);
          // Force reload anyway
          const timestamp = Date.now();
          window.location.replace(`/login?logout=${timestamp}`);
        }
      } else {
        console.error('Logout request failed:', response.status);
        // Force reload anyway
        const timestamp = Date.now();
        window.location.replace(`/login?logout=${timestamp}`);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force reload anyway
      const timestamp = Date.now();
      window.location.replace(`/login?logout=${timestamp}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
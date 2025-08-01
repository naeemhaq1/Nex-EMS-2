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
      // Development mode: Immediate auto-login for instant dashboard access
      console.log('DEV MODE: Attempting immediate auto-login...');
      attemptAutoLogin();
    } else {
      // Production mode: Check existing auth without auto-login
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      // Check if mobile device - set user immediately to prevent blue screen
      const isMobile = window.innerWidth <= 768 || 
                      /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Mobile|Tablet/i.test(navigator.userAgent);
      
      if (isMobile && isDevelopment) {
        // For mobile development, set user immediately to prevent blue screen
        const defaultUser = {
          id: 1,
          username: 'admin',
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        setUser(defaultUser);
        setLoading(false);
        console.log('Mobile user set immediately to prevent blue screen:', defaultUser);
        return;
      }
      
      // Fast session check with reduced timeout for quick dashboard loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Session-Sync': 'true'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Auth check successful:', data);
        setUser(data);
        
        localStorage.setItem('auth-state', JSON.stringify({
          authenticated: true,
          userId: data.id,
          timestamp: Date.now()
        }));
      } else {
        console.log('Auth check failed with status:', response.status);
        
        if (isDevelopment && response.status === 401) {
          console.log('Attempting auto-login in development mode...');
          await attemptAutoLogin();
        } else {
          setUser(null);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Auth check timeout - continuing gracefully');
        return;
      } else {
        console.error('Auth check failed:', error);
      }
      
      if (isDevelopment) {
        console.log('Attempting auto-login in development mode after error...');
        try {
          await attemptAutoLogin();
        } catch (autoLoginError) {
          console.log('Auto-login also failed, setting user to null');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const attemptAutoLogin = async () => {
    try {
      console.log('Auto-login: Attempting immediate dev auto-login');
      
      // Set loading to false immediately for mobile compatibility
      setLoading(false);
      
      // Create default user immediately for mobile to prevent blue screen
      const defaultUser = {
        id: 1,
        username: 'admin',
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      
      // Set user immediately to prevent blue screen
      setUser(defaultUser);
      console.log('User set immediately for mobile dashboard:', defaultUser);
      
      // Force immediate state update for mobile
      localStorage.setItem('auth-state', JSON.stringify({
        authenticated: true,
        userId: defaultUser.id,
        timestamp: Date.now()
      }));
      
      // Try to enhance with actual login in background
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300);
        
        const response = await fetch('/api/dev/auto-login', {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Fast-Login': 'true',
            'X-Mobile-Instant': 'true'
          },
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log('Auto-login successful:', data);
          if (data.success && data.user) {
            setUser(data.user);
            console.log('User updated from server:', data.user);
          }
        }
      } catch (bgError: any) {
        console.log('Background login failed, keeping default user:', bgError.message);
      }
      
    } catch (error: any) {
      console.error('Auto-login error:', error);
      
      // Always ensure we have a user set for mobile
      const defaultUser = {
        id: 1,
        username: 'admin',
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      setUser(defaultUser);
      console.log('Fallback user set after error:', defaultUser);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.error || 'Login failed',
          requiresPasswordChange: data.requiresPasswordChange,
          userId: data.userId
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
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
      const response = await fetch('/api/auth/logout', {
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
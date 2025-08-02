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
      
      // Try multiple auth endpoints for better compatibility
      const authEndpoints = ['/api/auth/me', '/api/stable-auth/me'];
      let authSuccess = false;

      for (const endpoint of authEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(endpoint, {
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
            
            if (data && (data.id || data.user?.id)) {
              const userData = data.user || data;
              setUser(userData);
              localStorage.setItem('auth-state', JSON.stringify({
                authenticated: true,
                userId: userData.id,
                timestamp: Date.now()
              }));
              authSuccess = true;
              break;
            }
          }
        } catch (error) {
          console.log(`Auth endpoint ${endpoint} failed:`, error);
          continue;
        }
      }

      if (!authSuccess) {
        console.log('All auth endpoints failed');
        setUser(null);
        localStorage.removeItem('auth-state');
      }
    } catch (error: any) {
      console.error('Auth check failed:', error);
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
      
      // Try multiple login endpoints for better compatibility
      const loginEndpoints = ['/api/auth/login', '/api/stable-auth/login'];
      
      for (const endpoint of loginEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
          });

          const data = await response.json();
          console.log(`Login response from ${endpoint}:`, data);

          if (response.ok && (data.success || data.user)) {
            const userData = data.user || data;
            console.log('Login successful, setting user:', userData);
            setUser(userData);
            setLoading(false);
            
            // Store auth state
            localStorage.setItem('auth-state', JSON.stringify({
              authenticated: true,
              userId: userData.id,
              timestamp: Date.now()
            }));
            
            return { success: true };
          } else if (data.error) {
            return { 
              success: false, 
              error: data.error || 'Login failed',
              requiresPasswordChange: data.requiresPasswordChange,
              userId: data.userId
            };
          }
        } catch (error) {
          console.log(`Login endpoint ${endpoint} failed:`, error);
          continue;
        }
      }
      
      return { success: false, error: 'All login endpoints failed. Please try again.' };
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
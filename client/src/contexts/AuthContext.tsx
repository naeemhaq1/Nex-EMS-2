import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  username: string;
  role: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  designation?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    requiresPasswordChange?: boolean;
  }>;
  logout: () => void;
  loading: boolean;
  token: string | null;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('accessToken')
  );

  // Auto-refresh token before expiry
  useEffect(() => {
    if (token) {
      // Refresh token every 10 minutes (tokens expire in 15 minutes)
      const interval = setInterval(() => {
        refreshToken();
      }, 10 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [token]);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('accessToken');

      if (!storedToken) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(storedToken);
      } else {
        // Token might be expired, try to refresh
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          // Refresh failed, clear auth state
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!storedRefreshToken) {
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          localStorage.setItem('accessToken', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);
          setToken(data.token);
          setUser(data.user);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.error,
          requiresPasswordChange: data.requiresPasswordChange
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);

    // Call logout endpoint to handle any server-side cleanup
    fetch('/api/auth/logout', { method: 'POST' }).catch(console.error);

    // Redirect to login
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      token,
      refreshToken 
    }}>
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
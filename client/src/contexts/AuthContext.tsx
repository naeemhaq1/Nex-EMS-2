import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  userId: number;
  username: string;
  role: string;
  employeeId?: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/users/user', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          setToken('authenticated'); // Token is in httpOnly cookie
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setToken('authenticated');
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

  const logout = async () => {
    try {
      await fetch('/api/users/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      token
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
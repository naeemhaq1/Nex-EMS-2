import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  empCode?: string;
  firstName?: string;
  lastName?: string;
  isFirstLogin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  login: async () => ({ success: false }),
  logout: () => {},
  updateUser: () => {}
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // For development, set a mock user if auth fails
        if (process.env.NODE_ENV === 'development') {
          setUser({
            id: 1,
            username: 'admin',
            role: 'admin',
            empCode: '123',
            firstName: 'John',
            lastName: 'Doe',
            isFirstLogin: false
          });
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // For development, set a mock user
      if (process.env.NODE_ENV === 'development') {
        setUser({
          id: 1,
          username: 'admin',
          role: 'admin',
          empCode: '123',
          firstName: 'John',
          lastName: 'Doe',
          isFirstLogin: false
        });
      }
    } finally {
      setLoading(false);
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
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Login failed' };
      }

      const userData = await response.json();
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      // For development, accept any login
      if (process.env.NODE_ENV === 'development') {
        const mockUser = {
          id: 1,
          username: username || 'admin',
          role: 'admin',
          empCode: '123',
          firstName: 'John',
          lastName: 'Doe',
          isFirstLogin: false
        };
        setUser(mockUser);
        return { success: true, user: mockUser };
      } else {
        return { success: false, error: 'Login failed' };
      }
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        return { ...prevUser, ...userData };
      }
      return prevUser;
    });
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
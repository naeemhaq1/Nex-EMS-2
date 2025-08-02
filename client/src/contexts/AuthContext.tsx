import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const checkAuth = async (): Promise<boolean> => {
    try {
      console.log('Checking authentication status...');
      
      // Use the same stable auth endpoint as desktop
      const response = await fetch('/api/stable-auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('Auth check successful:', userData);
        
        if (userData && userData.id) {
          setUser({
            id: userData.id.toString(),
            username: userData.username,
            name: userData.username || `User ${userData.id}`,
            role: userData.role || 'employee',
            isAdmin: ['admin', 'super_admin', 'superadmin'].includes(userData.role)
          });
          return true;
        } else {
          console.log('Empty user data received');
          setUser(null);
          return false;
        }
      } else {
        console.log('Auth check failed with status:', response.status);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      return false;
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Attempting login for user:', username);
      
      // Use the same stable auth endpoint as desktop
      const response = await fetch('/api/stable-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok && data.success) {
        console.log('Login successful, setting user:', data.user);
        setUser({
          id: data.user.id.toString(),
          username: data.user.username,
          name: data.user.username || `User ${data.user.id}`,
          role: data.user.role || 'employee',
          isAdmin: ['admin', 'super_admin', 'superadmin'].includes(data.user.role)
        });
        return true;
      } else {
        console.log('Login failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Use the same stable auth endpoint as desktop
    fetch('/api/stable-auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(console.error);

    setUser(null);
    setLocation('/');
  };

  useEffect(() => {
    // Check auth on mount using the same flow as desktop
    const initAuth = async () => {
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
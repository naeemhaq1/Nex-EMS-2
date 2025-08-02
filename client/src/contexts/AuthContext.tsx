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

  // Auto-login function disabled to prevent conflicts
  // const checkAuth = async () => {
  //   try {
  //     console.log('Checking authentication status...');
  //
  //     // Create abort controller for timeout handling
  //     const controller = new AbortController();
  //     const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second timeout

  //     const response = await fetch('/api/auth/user', {
  //       method: 'GET',
  //       credentials: 'include',
  //       signal: controller.signal
  //     });

  //     clearTimeout(timeoutId);

  //     if (response.ok) {
  //       const data = await response.json();
  //       console.log('Auto-login successful:', data);
  //       if (data.success && data.user) {
  //         setUser(data.user);
  //         console.log('User set in context:', data.user);
  //       }
  //       setLoading(false);
  //     } else {
  //       console.log('Auto-login failed with status:', response.status);
  //       setUser(null);
  //       setLoading(false);
  //     }
  //   } catch (error: any) {
  //     if (error.name === 'AbortError') {
  //       console.log('Auto-login timeout - gracefully handled');
  //       // Suppress AbortError to prevent runtime error plugin notifications
  //       console.log('Unhandled AbortError promise rejection caught and suppressed');
  //       setUser(null);
  //       setLoading(false);
  //       return;
  //     } else {
  //       console.error('Auto-login error:', error);
  //     }
  //     setUser(null);
  //     setLoading(false);
  //   }
  // };

  const checkAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser({
          id: userData.id,
          username: userData.username,
          name: userData.name || userData.username,
          role: userData.role || 'employee',
          isAdmin: userData.role === 'admin' || userData.role === 'super_admin'
        });
        return true;
      } else {
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser({
          id: userData.id,
          username: userData.username,
          name: userData.name || userData.username,
          role: userData.role || 'employee',
          isAdmin: userData.role === 'admin' || userData.role === 'super_admin'
        });
        return true;
      } else {
        console.error('Login error:', await response.text());
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
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(console.error);

    setUser(null);
    setLocation('/');
  };

  useEffect(() => {
    // Disabled auto-login to prevent conflicts
    console.log('Auto-login disabled - manual login required');
    setIsLoading(false);
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
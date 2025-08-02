import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const checkAuth = async (): Promise<boolean> => {
    try {
      console.log('Checking authentication...');

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Auth check successful:', data);
        setUser(data.user);
        return true;
      } else {
        console.log('Auth check failed, no valid session');
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      return false;
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('🚀 [LOGIN DEBUG] Starting login attempt');
      console.log('🚀 [LOGIN DEBUG] Username:', username);
      console.log('🚀 [LOGIN DEBUG] Password length:', password.length);
      console.log('🚀 [LOGIN DEBUG] Request URL:', '/api/auth/login');

      const requestBody = { username, password };
      console.log('🚀 [LOGIN DEBUG] Request body:', requestBody);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('🚀 [LOGIN DEBUG] Response status:', response.status);
      console.log('🚀 [LOGIN DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [LOGIN DEBUG] Login successful, full response:', data);
        console.log('✅ [LOGIN DEBUG] User data received:', data.user);
        console.log('✅ [LOGIN DEBUG] Cookies after login:', document.cookie);
        setUser(data.user);
        return true;
      } else {
        let errorData;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = { error: await response.text() };
        }

        console.error('❌ [LOGIN DEBUG] Login failed');
        console.error('❌ [LOGIN DEBUG] Status:', response.status);
        console.error('❌ [LOGIN DEBUG] Status text:', response.statusText);
        console.error('❌ [LOGIN DEBUG] Error data:', errorData);
        return false;
      }
    } catch (error) {
      console.error('💥 [LOGIN DEBUG] Login error:', error);
      console.error('💥 [LOGIN DEBUG] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setLocation('/');
  };

  useEffect(() => {
    const initAuth = async () => {
      console.log('Initializing auth context...');
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
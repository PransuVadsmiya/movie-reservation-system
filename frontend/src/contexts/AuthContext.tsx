'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authAPI, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // Verify token is still valid by fetching current user
          const currentUser = await authAPI.getCurrentUser();
          setUser(currentUser);
          // Update stored user in case role changed
          localStorage.setItem('user', JSON.stringify(currentUser));
        } catch (error) {
          // Token expired or invalid - clear storage
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Step 1: Get JWT token from backend
      const tokenResponse = await authAPI.login({ email, password });
      
      // Step 2: Store token in localStorage
      localStorage.setItem('access_token', tokenResponse.access_token);

      // Step 3: Fetch user details using the token
      const userData = await authAPI.getCurrentUser();
      
      // Step 4: Update state and localStorage
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error: any) {
      // Clear any partial state
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      // Backend creates user but doesn't auto-login
      await authAPI.signup({ email, password });
      // After signup, automatically log them in
      return await login(email, password);
    } catch (error: any) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error("Failed to refresh user", error);
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, isAdmin }}>
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

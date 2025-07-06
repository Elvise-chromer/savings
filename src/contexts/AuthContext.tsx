import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'parent' | 'child' | 'admin';
  phone_number?: string;
  is_active: boolean;
  two_factor_enabled: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, twoFactorCode?: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string, role: 'parent' | 'child', phoneNumber?: string) => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    // Check for stored auth state
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          isAuthenticated: true,
          loading: false,
        });
      } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = async (email: string, password: string, twoFactorCode?: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password, twoFactorCode);
      const { access_token, refresh_token } = response.data;
      
      // Store tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      // For demo purposes, create user based on email
      let user: User;
      if (email === 'john@example.com') {
        user = {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'parent',
          phone_number: '254712345678',
          is_active: true,
          two_factor_enabled: false,
          created_at: new Date().toISOString(),
        };
      } else if (email === 'jane@example.com') {
        user = {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'parent',
          phone_number: '254712345679',
          is_active: true,
          two_factor_enabled: false,
          created_at: new Date().toISOString(),
        };
      } else if (email === 'child@example.com') {
        user = {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'Little Doe',
          email: 'child@example.com',
          role: 'child',
          phone_number: '254712345680',
          is_active: true,
          two_factor_enabled: false,
          created_at: new Date().toISOString(),
        };
      } else {
        // For new users
        user = {
          id: Date.now().toString(),
          name: 'New User',
          email: email,
          role: 'parent',
          is_active: true,
          two_factor_enabled: false,
          created_at: new Date().toISOString(),
        };
      }
      
      localStorage.setItem('user', JSON.stringify(user));
      
      setAuthState({
        user,
        isAuthenticated: true,
        loading: false,
      });
      
      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Check if 2FA is required
      if (error.response?.headers?.['x-require-2fa']) {
        throw new Error('2FA_REQUIRED');
      }
      
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'parent' | 'child',
    phoneNumber?: string
  ): Promise<boolean> => {
    try {
      const response = await authAPI.register({
        name,
        email,
        password,
        role,
        phone_number: phoneNumber,
      });
      
      // Auto-login after registration
      return await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setAuthState(prev => ({ ...prev, user: updatedUser }));
    }
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
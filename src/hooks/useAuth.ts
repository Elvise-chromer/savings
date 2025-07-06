import { useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'parent' | 'child';
  phone_number?: string;
  is_active: boolean;
  two_factor_enabled: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export const useAuth = () => {
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
      
      // Get user info from token payload (you might want to make a separate API call)
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      
      // For now, we'll create a mock user object
      // In production, you'd make an API call to get user details
      const user: User = {
        id: payload.sub,
        name: 'User', // This should come from API
        email: email,
        role: 'parent', // This should come from API
        is_active: true,
        two_factor_enabled: false,
      };
      
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
      
      const user = response.data;
      
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

  return {
    ...authState,
    login,
    register,
    logout,
    updateUser,
  };
};
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; major?: string; targetExam?: string; preferredComplexity?: string }) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('drag_auth_token');
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (err) {
          console.warn('Stored token expired or invalid, clearing:', err);
          localStorage.removeItem('drag_auth_token');
          // Auto log in as demo student so app is always interactive
          try {
            const demo = await authApi.demoLogin();
            setUser(demo.user);
          } catch (e) {
            console.error('Demo auto-login failed:', e);
          }
        }
      } else {
        // Auto initialize demo user for immediate smooth interaction
        try {
          const demo = await authApi.demoLogin();
          setUser(demo.user);
        } catch (e) {
          console.error('Demo login failed:', e);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    setUser(res.user);
  };

  const register = async (data: { name: string; email: string; password: string; major?: string; targetExam?: string; preferredComplexity?: string }) => {
    const res = await authApi.register(data);
    setUser(res.user);
  };

  const demoLogin = async () => {
    const res = await authApi.demoLogin();
    setUser(res.user);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    const updated = await authApi.updateProfile(data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        demoLogin,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

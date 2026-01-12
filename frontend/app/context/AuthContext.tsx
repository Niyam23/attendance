'use client'

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email?: string;
  mobileNumber?: string;
  role: string;
  employeeId?: string;
  onboardingCompleted?: boolean;
  profilePhoto?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string | null, mobileNumber: string | null, password: string | null, otp: string | null) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (name: string, email: string | null, mobileNumber: string | null, password: string | null, otp: string | null, role: string, departmentId?: string | null) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user on mount if token exists in localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('token');
        
        if (storedToken) {
          // Token exists, fetch user
          try {
            const response = await axiosInstance.get('/auth/me');
            setUser(response.data);
          } catch (error: any) {
            console.error('Error fetching user on init:', error);
            // Only clear token if it's an authentication error (401 or 403)
            // Network errors (no response) shouldn't clear the token
            if (error.response?.status === 401 || error.response?.status === 403) {
              // Token is invalid/expired, clear it
              localStorage.removeItem('token');
              setUser(null);
            }
            // For network errors, keep the token but don't set user
            // User will need to refresh or the next API call will handle it
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []); // Run only once on mount

  const fetchUser = async () => {
    try {
      const response = await axiosInstance.get('/auth/me');
      setUser(response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user:', error);
      // Only clear token if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
      }
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await axiosInstance.get('/auth/me');
      const updatedUser = response.data;
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  };

  const login = async (
    email: string | null,
    mobileNumber: string | null,
    password: string | null,
    otp: string | null
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const loginData: any = {};
      if (email) {
        loginData.email = email;
        loginData.password = password;
      }
      if (mobileNumber) {
        loginData.mobileNumber = mobileNumber;
        loginData.otp = otp;
      }

      const response = await axios.post('http://localhost:5000/api/auth/login', loginData);
      const { token: newToken, user: userData } = response.data;
      
      // Store token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', newToken);
      }
      
      // Update state
      setUser(userData);
      
      toast.success('Login successful!');
      return { success: true, user: userData };
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (
    name: string,
    email: string | null,
    mobileNumber: string | null,
    password: string | null,
    otp: string | null,
    role: string,
    departmentId?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const registerData: any = {
        name,
        role
      };

      if (email) {
        registerData.email = email;
        registerData.password = password;
      }
      if (mobileNumber) {
        registerData.mobileNumber = mobileNumber;
        registerData.otp = otp;
      }
      if (departmentId) {
        registerData.departmentId = parseInt(departmentId);
      }

      const response = await axios.post('http://localhost:5000/api/auth/register', registerData);
      const { token: newToken, user: userData } = response.data;
      
      // Store token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', newToken);
      }
      
      // Update state
      setUser(userData);
      
      toast.success('Registration successful!');
      return { success: true, user: userData };
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      toast.success('Logged out successfully');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


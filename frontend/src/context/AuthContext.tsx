import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email?: string;
  mobileNumber?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string | null, mobileNumber: string | null, password: string | null, otp: string | null) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string | null, mobileNumber: string | null, password: string | null, otp: string | null, role: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  });

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async (): Promise<void> => {
    try {
      const response = await axios.get('http://localhost:5000/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string | null,
    mobileNumber: string | null,
    password: string | null,
    otp: string | null
  ): Promise<{ success: boolean; error?: string }> => {
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
      setToken(newToken);
      setUser(userData);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', newToken);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      toast.success('Login successful!');
      return { success: true };
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
    role: string
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

      const response = await axios.post('http://localhost:5000/api/auth/register', registerData);
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', newToken);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      toast.success('Registration successful!');
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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

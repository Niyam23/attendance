import axios from 'axios';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.29:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect for password change errors - let the component handle them
      const url = error.config?.url || '';
      if (url.includes('/change-password') || url.includes('/auth/me')) {
        // Don't redirect, just return the error - let AuthContext handle it
        return Promise.reject(error);
      }
      
      // Don't redirect if we're already on the auth page or if it's the initial auth check
      if (typeof window !== 'undefined' && 
          window.location.pathname !== '/auth' && 
          !url.includes('/auth/me')) {
      // Token expired or invalid, clear it
        localStorage.removeItem('token');
        // Only redirect if not already on auth page and not during initial auth check
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;


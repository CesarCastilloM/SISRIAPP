import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';

const AuthContext = createContext(null);

// Security constants
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getDecryptedToken();
        if (token) {
          const decodedToken = jwtDecode(token);
          
          if (isTokenExpired(decodedToken)) {
            await refreshToken();
          } else {
            setUser(decodedToken);
            setupTokenRefresh(decodedToken);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Setup automatic token refresh
  const setupTokenRefresh = (decodedToken) => {
    const expiresIn = decodedToken.exp * 1000 - Date.now();
    const refreshTime = Math.max(expiresIn - 5 * 60 * 1000, 0); // Refresh 5 minutes before expiry

    setTimeout(async () => {
      try {
        await refreshToken();
      } catch (err) {
        console.error('Token refresh error:', err);
        handleLogout();
      }
    }, refreshTime);
  };

  // Token encryption/decryption
  const encryptToken = (token) => {
    return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
  };

  const decryptToken = (encryptedToken) => {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const getDecryptedToken = () => {
    const encryptedToken = localStorage.getItem(TOKEN_KEY);
    return encryptedToken ? decryptToken(encryptedToken) : null;
  };

  // Token validation
  const isTokenExpired = (decodedToken) => {
    if (!decodedToken.exp) return true;
    return decodedToken.exp * 1000 <= Date.now();
  };

  // Authentication methods
  const handleLogin = async (credentials) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/login', credentials);
      const { token, refreshToken } = response.data;

      // Encrypt tokens before storing
      localStorage.setItem(TOKEN_KEY, encryptToken(token));
      localStorage.setItem(REFRESH_TOKEN_KEY, encryptToken(refreshToken));

      const decodedToken = jwtDecode(token);
      setUser(decodedToken);
      setupTokenRefresh(decodedToken);

      // Setup axios interceptor
      setupAxiosInterceptor(token);

      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
    navigate('/login');
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post('/api/auth/refresh', {
        refreshToken: decryptToken(refreshToken),
      });

      const { token: newToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem(TOKEN_KEY, encryptToken(newToken));
      localStorage.setItem(REFRESH_TOKEN_KEY, encryptToken(newRefreshToken));

      const decodedToken = jwtDecode(newToken);
      setUser(decodedToken);
      setupTokenRefresh(decodedToken);
      setupAxiosInterceptor(newToken);

      return newToken;
    } catch (err) {
      console.error('Token refresh failed:', err);
      handleLogout();
      throw err;
    }
  };

  // Axios interceptor setup
  const setupAxiosInterceptor = (token) => {
    axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  };

  // Session monitoring
  useEffect(() => {
    let sessionTimeout;

    const resetSessionTimeout = () => {
      if (sessionTimeout) clearTimeout(sessionTimeout);
      if (user) {
        sessionTimeout = setTimeout(handleLogout, SESSION_TIMEOUT);
      }
    };

    const handleUserActivity = () => {
      resetSessionTimeout();
    };

    // Monitor user activity
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    resetSessionTimeout();

    return () => {
      if (sessionTimeout) clearTimeout(sessionTimeout);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
    };
  }, [user]);

  const contextValue = {
    user,
    loading,
    error,
    login: handleLogin,
    logout: handleLogout,
    refreshToken,
  };

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <AuthContext.Provider value={contextValue}>
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

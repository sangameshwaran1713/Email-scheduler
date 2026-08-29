import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthContextType, User } from '../types/index';
import { apiService } from '../services/api';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogin = (newToken: string) => {
    // Validate JWT structure before accepting
    const parts = newToken.split('.');
    if (parts.length !== 3) {
      return;
    }

    setToken(newToken);
    apiService.setAuthToken(newToken);
    localStorage.setItem('token', newToken);
    
    // Decode JWT to get user info (server validates signature on each API call)
    try {
      const payload = JSON.parse(atob(parts[1]));
      // Reject obviously expired tokens
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        setIsLoading(false);
        return;
      }
      setUser({
        id: payload.userId || payload.id || 'user-1',
        email: payload.email || 'user@example.com',
        name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
      });
    } catch {
      // Token payload decode failed — don't store it
      localStorage.removeItem('token');
      apiService.clearAuthToken();
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      handleLogin(urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        const parts = storedToken.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
              // Token expired — clear it
              localStorage.removeItem('token');
              apiService.clearAuthToken();
            } else {
              setToken(storedToken);
              apiService.setAuthToken(storedToken);
              setUser({
                id: payload.userId || payload.id || 'user-1',
                email: payload.email || 'user@example.com',
                name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
              });
            }
          } catch {
            localStorage.removeItem('token');
          }
        } else {
          localStorage.removeItem('token');
        }
      }
      
      setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    apiService.clearAuthToken();
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

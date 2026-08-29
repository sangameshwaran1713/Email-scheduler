import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthContextType, User } from '../types/index';
import { apiService } from '../services/api';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogin = (newToken: string) => {
    console.log('🔐 Logging in with token:', newToken.slice(0, 20) + '...');
    
    setToken(newToken);
    apiService.setAuthToken(newToken);
    localStorage.setItem('token', newToken);
    
    // Decode JWT to get user info
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      console.log('👤 User:', payload);
      setUser({
        id: payload.userId || payload.id || 'user-1',
        email: payload.email || 'user@example.com',
        name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
      });
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    // ONLY check for token in URL (from OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      // Found token in URL from OAuth callback
      console.log('✅ Token found in URL from OAuth callback');
      handleLogin(urlToken);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // NO token in URL
      // Check localStorage for existing session
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        // User was previously logged in
        console.log('✅ Token found in localStorage (previous session)');
        setToken(storedToken);
        apiService.setAuthToken(storedToken);
        // Decode token to get user info
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          setUser({
            id: payload.userId || payload.id || 'user-1',
            email: payload.email || 'user@example.com',
            name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
          });
        } catch (e) {
          console.error('Failed to decode stored token');
          localStorage.removeItem('token');
        }
      } else {
        // No token anywhere - user is NOT logged in
        console.log('❌ No token found - user not authenticated');
      }
      
      setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    console.log('🚪 Logging out');
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

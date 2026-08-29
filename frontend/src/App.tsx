import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('🔍 AppContent render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  console.log('📊 AppContent render:', {
    isAuthenticated,
    isLoading,
    shouldShowDashboard: !isLoading && isAuthenticated,
    shouldShowLogin: !isLoading && !isAuthenticated,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If NOT authenticated, show login page
  if (!isAuthenticated) {
    console.log('📄 Rendering LoginPage');
    return <LoginPage />;
  }

  // If authenticated, show dashboard
  console.log('📊 Rendering DashboardPage');
  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

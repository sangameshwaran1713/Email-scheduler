import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loginWithEmail } from '../services/api';

export function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Manual login
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      const { token } = await loginWithEmail(email, password);
      login(token);
      addToast('Successfully logged in!', 'info');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Login failed. Please try again.';
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth login
  const handleGoogleLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Login
        </h1>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-3 px-4 bg-green-50 text-green-700 font-semibold rounded-lg hover:bg-green-100 transition flex items-center justify-center gap-2 mb-6 border border-green-200 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider */}
        <p className="text-center text-gray-500 text-sm mb-6">
          or sign up through email
        </p>

        {/* Manual Login Form */}
        <form onSubmit={handleManualLogin}>
          {/* Email Input */}
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 mb-4 bg-gray-100 rounded placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none disabled:opacity-50 text-gray-800"
          />

          {/* Password Input */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 mb-6 bg-gray-100 rounded placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none disabled:opacity-50 text-gray-800"
          />

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Note */}
        <p className="text-center text-gray-500 text-xs mt-4">
          For demo, use Google login
        </p>
      </div>
    </div>
  );
}

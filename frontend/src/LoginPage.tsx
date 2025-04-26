import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      localStorage.setItem('firebase_id_token', idToken);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-700">Login to ClarifAI</h2>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center border border-gray-200 rounded-lg py-2 mb-6 bg-white hover:bg-gray-100 transition"
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C36.18 2.36 30.45 0 24 0 14.82 0 6.73 5.8 2.69 14.09l7.98 6.2C12.36 13.13 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.29c-1.13-3.36-1.13-6.97 0-10.33l-7.98-6.2C.7 16.36 0 20.09 0 24c0 3.91.7 7.64 2.69 12.24l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.45 0 12.18-2.13 16.7-5.81l-7.19-5.59c-2.01 1.35-4.59 2.15-7.51 2.15-6.26 0-11.64-3.63-13.33-8.79l-7.98 6.2C6.73 42.2 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
          <span className="text-slate-700 font-medium">{loading ? 'Signing in...' : 'Login with Google'}</span>
        </button>
        {error && <div className="mb-4 text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm">{error}</div>}
      </div>
    </div>
  );
};

export default LoginPage;

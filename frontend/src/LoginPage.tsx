import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const API_BASE = 'http://localhost:8000/api'; // Change if backend is hosted elsewhere

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const sendUserToBackend = async (user: { email: string | null, name: string | null, idToken: string }) => {
    if (!user.email) return;
    const res = await fetch(`${API_BASE}/users/from-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.idToken}`,
      },
      body: JSON.stringify({ email: user.email, name: user.name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to save user');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      console.log('ID Token:', idToken);
      await sendUserToBackend({ email: user.email, name: user.displayName, idToken });
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let userCredential;
      if (mode === 'login') {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      console.log('ID Token:', idToken);
      await sendUserToBackend({ email: user.email, name: user.displayName, idToken });
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || (mode === 'login' ? 'Login failed' : 'Signup failed'));
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
        <div className="flex items-center my-4">
          <div className="flex-grow h-px bg-gray-200" />
          <span className="mx-3 text-gray-400 text-sm">or</span>
          <div className="flex-grow h-px bg-gray-200" />
        </div>
        <form onSubmit={handleEmailAuth}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-slate-700 mb-2 font-medium">Email</label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-gray-50 placeholder-gray-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Your Email"
              autoComplete="email"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-slate-700 mb-2 font-medium">Password</label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-gray-50 placeholder-gray-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-semibold transition mb-2"
            disabled={loading}
          >
            {loading ? (mode === 'login' ? 'Logging in...' : 'Signing up...') : (mode === 'login' ? 'Login' : 'Create Account')}
          </button>
        </form>
        <div className="text-center mt-2">
          <button
            type="button"
            className="text-blue-500 hover:underline text-sm"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            disabled={loading}
          >
            {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Login'}
          </button>
        </div>
        {error && <div className="mt-4 text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm">{error}</div>}
      </div>
    </div>
  );
};

export default LoginPage;

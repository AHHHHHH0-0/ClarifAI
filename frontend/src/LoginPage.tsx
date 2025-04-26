import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agree, setAgree] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agree) {
      setError('You must agree to the privacy policy.');
      return;
    }
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Login failed');
      }
      const data = await res.json();
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-700">Login to ClarifAI</h2>
        <div className="mb-6">
          <GoogleLogin
            onSuccess={credentialResponse => {
              // You should send credentialResponse.credential to your backend for verification
              console.log('Google credential:', credentialResponse);
              // For now, just navigate to dashboard
              navigate('/dashboard');
            }}
            onError={() => {
              setError('Google Login Failed');
            }}
            width="100%"
          />
        </div>
        <div className="flex items-center my-4">
          <div className="flex-grow h-px bg-gray-200" />
          <span className="mx-3 text-gray-400 text-sm">or</span>
          <div className="flex-grow h-px bg-gray-200" />
        </div>
        {error && <div className="mb-4 text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-slate-700 mb-2 font-medium">Your Email <span className="text-red-500">*</span></label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-gray-50 placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Your Email"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-slate-700 mb-2 font-medium">Password <span className="text-red-500">*</span></label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-gray-50 placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
            />
          </div>
          <div className="flex items-center mb-2">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
              className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-slate-700 text-sm">Remember me</label>
          </div>
          <div className="flex items-center mb-6">
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={() => setAgree(!agree)}
              className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              required
            />
            <label htmlFor="agree" className="ml-2 block text-slate-700 text-sm">
              I agree to storage of my data according to <a href="#" className="text-blue-500 underline">Privacy Policy</a>.
            </label>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded font-semibold transition"
            >
              Login <span className="ml-1">→</span>
            </button>
            <button
              type="button"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-semibold transition"
              onClick={() => alert('Create Account not implemented.')}
            >
              Create Account
            </button>
          </div>
          <div className="text-center mt-2">
            <a href="#" className="text-blue-500 hover:underline text-sm">Forgot your password or cannot log in?</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

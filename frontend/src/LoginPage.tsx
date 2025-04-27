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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-primary-light/5 p-8 shadow-lg rounded-2xl border border-border">
        <h2 className="text-2xl font-bold mb-6 text-center text-text">Login to ClarifAI</h2>
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
          <div className="flex-grow h-px border-t border-border" />
          <span className="mx-3 text-text-muted text-sm">or</span>
          <div className="flex-grow h-px border-t border-border" />
        </div>
        {error && <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-text mb-2 font-medium">Your Email <span className="text-red-500">*</span></label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text bg-background placeholder-text-muted"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Your Email"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-text mb-2 font-medium">Password <span className="text-red-500">*</span></label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text bg-background placeholder-text-muted"
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
              className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-text text-sm">Remember me</label>
          </div>
          <div className="flex items-center mb-6">
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={() => setAgree(!agree)}
              className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
              required
            />
            <label htmlFor="agree" className="ml-2 block text-text text-sm">
              I agree to storage of my data according to <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
            </label>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-200"
            >
              Login <span className="ml-1">→</span>
            </button>
            <button
              type="button"
              className="flex-1 bg-primary-light hover:bg-primary-light/80 text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-200"
              onClick={() => alert('Create Account not implemented.')}
            >
              Create Account
            </button>
          </div>
          <div className="text-center mt-2">
            <a href="#" className="text-primary hover:underline text-sm">Forgot your password or cannot log in?</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

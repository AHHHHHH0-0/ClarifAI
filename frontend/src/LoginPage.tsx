import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';

// SVG Blob Background component
const BlobBackground = () => (
  <svg
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute w-[300px] h-[300px] opacity-10 -z-10"
  >
    <path
      fill="#C4B5FD" // Lighter purple - Indigo-300
      d="M45.9,-44.7C59.2,-32.3,69.7,-16.2,71.3,1.7C72.9,19.5,65.7,39.1,52.3,52.8C39,66.5,19.5,74.3,0.1,74.2C-19.3,74.1,-38.6,66.1,-51.7,52.4C-64.9,38.6,-71.9,19.3,-70.3,1.5C-68.7,-16.2,-58.6,-32.4,-45.4,-44.8C-32.3,-57.2,-16.2,-65.6,0,-65.6C16.2,-65.7,32.5,-57.1,45.9,-44.7Z"
      transform="translate(100 100)"
    />
  </svg>
);

// Voice Bubble Animation component
const VoiceBubble = () => {
  return (
    <div className="relative flex justify-center items-center h-20 md:h-20 sm:h-10 mb-6">
      <div className="relative">
        <BlobBackground />
        <motion.div
          className="w-20 h-20 md:w-20 md:h-20 sm:w-10 sm:h-10 rounded-full flex justify-center items-center"
          animate={{
            scale: [1, 1.05, 1],
            background: [
              'linear-gradient(135deg, #C4B5FD, #818CF8)', // Lighter purple gradient
              '#818CF8', // Indigo-400 instead of Indigo-600
              'linear-gradient(135deg, #C4B5FD, #818CF8)', // Back to lighter gradient
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Sound Waves */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path
              d="M9 22V19M15 22V19M12 22V2M18 7V17M6 7V17M21 10V14M3 10V14"
              stroke="#FFFFFF" // Pure White
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ 
                pathLength: [0.3, 1, 0.3], 
                opacity: [0.4, 1, 0.4] 
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </svg>
        </motion.div>
      </div>
    </div>
  );
};

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      {/* Voice Bubble Animation above the card */}
      <VoiceBubble />
      
      <div className="max-w-md w-full bg-white p-8 shadow-lg rounded-2xl border border-[#C4B5FD]">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#818CF8]">Login to ClarifAI</h2>
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
          <div className="flex-grow h-px border-t border-[#C4B5FD]" />
          <span className="mx-3 text-[#6B7280] text-sm">or</span>
          <div className="flex-grow h-px border-t border-[#C4B5FD]" />
        </div>
        {error && <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-[#374151] mb-2 font-medium">Your Email <span className="text-red-500">*</span></label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-[#C4B5FD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:border-[#818CF8] text-[#374151] bg-white placeholder-[#6B7280]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Your Email"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-[#374151] mb-2 font-medium">Password <span className="text-red-500">*</span></label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-[#C4B5FD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:border-[#818CF8] text-[#374151] bg-white placeholder-[#6B7280]"
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
              className="h-4 w-4 text-[#818CF8] border-[#C4B5FD] rounded focus:ring-[#818CF8]"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-[#6B7280] text-sm">Remember me</label>
          </div>
          <div className="flex items-center mb-6">
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={() => setAgree(!agree)}
              className="h-4 w-4 text-[#818CF8] border-[#C4B5FD] rounded focus:ring-[#818CF8]"
              required
            />
            <label htmlFor="agree" className="ml-2 block text-[#6B7280] text-sm">
              I agree to storage of my data to <a href="#" className="text-[#818CF8] hover:underline">Privacy Policy</a>.
            </label>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="submit"
              className="flex-1 bg-[#818CF8] hover:bg-[#6366F1] text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-200"
            >
              Login <span className="ml-1">→</span>
            </button>
            <button
              type="button"
              className="flex-1 bg-[#C4B5FD] hover:bg-[#A78BFA] text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-200"
              onClick={() => alert('Create Account not implemented.')}
            >
              Create Account
            </button>
          </div>
          <div className="text-center mt-2">
            <a href="#" className="text-[#818CF8] hover:underline text-sm">Forgot your password or cannot log in?</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

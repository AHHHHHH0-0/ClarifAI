import React, { useState } from "react";
import { auth, googleProvider } from "./firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { API_BASE, getAuthHeaders } from "./utils/api";

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
              "linear-gradient(135deg, #C4B5FD, #818CF8)", // Lighter purple gradient
              "#818CF8", // Indigo-400 instead of Indigo-600
              "linear-gradient(135deg, #C4B5FD, #818CF8)", // Back to lighter gradient
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Sound Waves */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d="M9 22V19M15 22V19M12 22V2M18 7V17M6 7V17M21 10V14M3 10V14"
              stroke="#FFFFFF" // Pure White
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{
                pathLength: [0.3, 1, 0.3],
                opacity: [0.4, 1, 0.4],
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  const sendUserToBackend = async (user: {
    email: string | null;
    name: string | null;
    idToken: string;
  }) => {
    if (!user.email) return;
    const res = await fetch(`${API_BASE}/users/from-firebase`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(user.idToken),
      },
      body: JSON.stringify({ email: user.email, name: user.name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to save user");
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      console.log("ID Token:", idToken);
      await sendUserToBackend({
        email: user.email,
        name: user.displayName,
        idToken,
      });
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Google login failed");
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
      if (mode === "login") {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      } else {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      }
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      console.log("ID Token:", idToken);
      await sendUserToBackend({
        email: user.email,
        name: user.displayName,
        idToken,
      });
      // Store user info for dashboard personalization
      localStorage.setItem(
        "userName",
        user.displayName || user.email || "User"
      );
      window.location.href = "/dashboard";
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("Account does not exist. Please sign up first.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Account does not exist. Please sign up first.");
      } else {
        setError(
          err.message || (mode === "login" ? "Login failed" : "Signup failed")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      {/* Voice Bubble Animation above the card */}
      <VoiceBubble />
      <div className="max-w-md w-full bg-white p-8 shadow-lg rounded-2xl border border-[#C4B5FD]">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#818CF8]">
          Login to ClarifAI
        </h2>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center border border-gray-200 rounded-lg py-2 mb-6 bg-white hover:bg-gray-100 transition"
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
            <g>
              <path
                fill="#4285F4"
                d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C36.18 2.36 30.45 0 24 0 14.82 0 6.73 5.8 2.69 14.09l7.98 6.2C12.36 13.13 17.74 9.5 24 9.5z"
              />
              <path
                fill="#34A853"
                d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.98 37.13 46.1 31.3 46.1 24.55z"
              />
              <path
                fill="#FBBC05"
                d="M10.67 28.29c-1.13-3.36-1.13-6.97 0-10.33l-7.98-6.2C.7 16.36 0 20.09 0 24c0 3.91.7 7.64 2.69 12.24l7.98-6.2z"
              />
              <path
                fill="#EA4335"
                d="M24 48c6.45 0 12.18-2.13 16.7-5.81l-7.19-5.59c-2.01 1.35-4.59 2.15-7.51 2.15-6.26 0-11.64-3.63-13.33-8.79l-7.98 6.2C6.73 42.2 14.82 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </g>
          </svg>
          <span className="text-slate-700 font-medium">
            {loading ? "Signing in..." : "Login with Google"}
          </span>
        </button>
        <div className="flex items-center my-4">
          <div className="flex-grow h-px border-t border-[#C4B5FD]" />
          <span className="mx-3 text-[#6B7280] text-sm">or</span>
          <div className="flex-grow h-px border-t border-[#C4B5FD]" />
        </div>
        {error && (
          <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleEmailAuth}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-[#374151] mb-2 font-medium"
            >
              Your Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-[#C4B5FD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:border-[#818CF8] text-[#374151] bg-white placeholder-[#6B7280]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Your Email"
              autoComplete="email"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-[#374151] mb-2 font-medium"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-[#C4B5FD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:border-[#818CF8] text-[#374151] bg-white placeholder-[#6B7280]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
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
              onClick={() => alert("Create Account not implemented.")}
            >
              Create Account
            </button>
          </div>
          <div className="text-center mt-2">
            <a href="#" className="text-[#818CF8] hover:underline text-sm">
              Forgot your password or cannot log in?
            </a>
          </div>
        </form>
        <div className="text-center mt-2">
          <button
            type="button"
            className="text-blue-500 hover:underline text-sm"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            disabled={loading}
          >
            {mode === "login"
              ? "Don't have an account? Create one"
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

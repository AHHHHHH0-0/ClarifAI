import React from 'react';
import { motion } from 'framer-motion';
import DeviceMockup from './DeviceMockup';

const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4 md:px-8">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary-light/5 z-0"></div>
      
      {/* Background Blob/Wave */}
      <div className="absolute bottom-0 left-0 right-0 w-full h-64 z-0 opacity-20">
        <svg viewBox="0 0 1440 320" className="w-full h-full" preserveAspectRatio="none">
          <path 
            fill="#3B82F6" 
            fillOpacity="1" 
            d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto max-w-7xl z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 py-12">
          {/* Left Side - Hero Text */}
          <div className="w-full md:w-1/2 text-center md:text-left space-y-8">
            <motion.h1 
              className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold text-primary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Turn Confusion <br className="hidden sm:block" />
              <span className="text-primary-light">into Clarity</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-text-muted max-w-lg mx-auto md:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Instantly simplify complex lecture content with AI-powered explanations tailored to your learning style.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <button className="bg-primary hover:bg-primary-hover transition-colors duration-300 text-white font-medium py-4 px-10 rounded-xl text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-transform">
                Get Started — It's Free
              </button>
            </motion.div>
          </div>
          
          {/* Right Side - Visual Element */}
          <div className="w-full md:w-1/2 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Animated Voice Bubble */}
              <div className="absolute -left-12 -top-8 z-10">
                <motion.div
                  className="w-24 h-24 bg-gradient-to-br from-primary to-primary-light rounded-full opacity-80"
                  animate={{ 
                    scale: [1, 1.05, 1, 1.03, 1],
                    opacity: [0.8, 0.6, 0.8]
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut" 
                  }}
                />
              </div>
              
              {/* Device Mockup */}
              <DeviceMockup type="phone" />
            </motion.div>
          </div>
        </div>
        
        {/* Feature Icons */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-16 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary-light/10 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text mb-2">Instant Simplification</h3>
            <p className="text-text-muted">Complex topics explained in simple language you can understand</p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary-light/10 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text mb-2">Voice-Activated</h3>
            <p className="text-text-muted">Simply ask questions with your voice for immediate clarification</p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary-light/10 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text mb-2">AI-Powered Learning</h3>
            <p className="text-text-muted">Our AI adapts to your learning style for personalized explanations</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection; 
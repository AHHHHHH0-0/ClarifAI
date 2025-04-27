import React from "react";
import { motion } from "framer-motion";
import DeviceMockup from "./DeviceMockup";

// Star icon component for ratings
const StarIcon = () => (
  <svg
    className="w-5 h-5 text-yellow-400"
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

// Testimonial component
const Testimonial = ({
  name,
  comment,
  image,
}: {
  name: string;
  comment: string;
  image: string;
}) => (
  <div className="bg-white/20 backdrop-blur-sm p-6 rounded-xl border border-white/30 hover:border-indigo-400/50 transition-colors shadow-xl flex flex-col">
    <div className="flex items-center mb-4">
      <img
        src={image}
        alt={name}
        className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-indigo-400"
      />
      <div>
        <h4 className="font-semibold text-indigo-300">{name}</h4>
        <div className="flex">
          <StarIcon />
          <StarIcon />
          <StarIcon />
          <StarIcon />
          <StarIcon />
        </div>
      </div>
    </div>
    <p className=" font-medium text-sm text-text-muted">{comment}</p>
  </div>
);

const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4 md:px-8">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary-light/5 z-0"></div>

      {/* Background Blob/Wave */}
      <div className="absolute bottom-0 left-0 right-0 w-full h-64 z-0 opacity-20">
        <svg
          viewBox="0 0 1440 320"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
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
              className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold text-indigo-600"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Turn Confusion <br className="hidden sm:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">into Clarity</span>
            </motion.h1>

            <motion.p
              className="text-xl text-text-muted max-w-lg mx-auto md:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Instantly simplify complex lecture content with AI-powered
              explanations tailored to your learning style.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <a href="/login">  <button className="bg-indigo-600 hover:bg-indigo-700 transition-colors duration-300 text-white font-medium py-4 px-10 rounded-xl text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-transform">
                Get Started — It's Free
              </button></a>
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
                  className="w-24 h-24 bg-indigo-600 rounded-full opacity-80"
                  animate={{
                    scale: [1, 1.05, 1, 1.03, 1],
                    opacity: [0.8, 0.6, 0.8],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut",
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
            <div className="w-16 h-16 rounded-full bg-indigo-600/10 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text mb-2">
              Instant Simplification
            </h3>
            <p className="text-text-muted">
              Complex topics explained in simple language you can understand
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-600/10 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text mb-2">
              Voice-Activated
            </h3>
            <p className="text-text-muted">
              Simply ask questions with your voice for immediate clarification
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-600/10 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text mb-2">
              AI-Powered Learning
            </h3>
            <p className="text-text-muted">
              Our AI adapts to your learning style for personalized explanations
            </p>
          </div>
        </motion.div>

        {/* Testimonials Section */}
        <motion.div
          className="mt-24 mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-indigo-400 mb-3">
              What Our Users Say
            </h2>
            <p className="text-text-muted max-w-2xl mx-auto">
              Join thousands of students who have transformed their learning
              experience with ClarifAI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Testimonial
              name="Sarah Johnson"
              image="https://randomuser.me/api/portraits/women/32.jpg"
              comment="ClarifAI helped me understand quantum mechanics in minutes! The explanations are clear and tailored to my learning style. I'm acing my physics class now."
            />
            <Testimonial
              name="David Chen"
              image="https://randomuser.me/api/portraits/men/44.jpg"
              comment="As a computer science student, complex algorithms were my biggest challenge. ClarifAI breaks everything down so clearly. I'm learning twice as fast now!"
            />
            <Testimonial
              name="Aisha Patel"
              image="https://randomuser.me/api/portraits/women/65.jpg"
              comment="The voice feature is a game-changer! I can ask questions during lectures without disrupting the class. My grades in biochemistry have improved dramatically."
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
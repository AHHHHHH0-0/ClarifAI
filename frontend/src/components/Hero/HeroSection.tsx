import React from 'react';
import DeviceMockup from './DeviceMockup';
import ThoughtBubble from './ThoughtBubble';

const HeroSection: React.FC = () => {
  // Generate random bubbles for the background
  const bubbles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    size: Math.floor(Math.random() * 40) + 20, // Size between 20-60px
    left: `${Math.floor(Math.random() * 100)}%`,
    delay: Math.random() * 5, // Random delay between 0-5s
    duration: Math.random() * 10 + 10, // Duration between 10-20s
  }));

  return (
    <section className="relative min-h-screen bg-white overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Background Bubbles */}
      {bubbles.map((bubble) => (
        <ThoughtBubble
          key={bubble.id}
          size={bubble.size}
          left={bubble.left}
          delay={bubble.delay}
          duration={bubble.duration}
        />
      ))}
      
      {/* Hero Content */}
      <div className="z-10 max-w-6xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Turn Confusion into Clarity
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
          Instantly simplify complex lecture content with a single click.
        </p>
      </div>
      
      {/* Device Display */}
      <div className="z-10 flex flex-col md:flex-row items-center justify-center gap-12">
        <DeviceMockup type="phone" />
        <DeviceMockup type="laptop" />
      </div>
      
      {/* CTA Button */}
      <div className="z-10 mt-16">
        <button className="bg-accent hover:bg-blue-900 transition-colors text-white font-medium py-3 px-8 rounded-lg text-lg shadow-lg hover:shadow-xl">
          Get Started - It's Free
        </button>
      </div>
    </section>
  );
};

export default HeroSection; 
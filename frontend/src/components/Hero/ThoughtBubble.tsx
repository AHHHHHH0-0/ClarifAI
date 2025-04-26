import React from 'react';
import { motion } from 'framer-motion';

type ThoughtBubbleProps = {
  size: number;
  left: string;
  delay: number;
  duration: number;
};

const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({ size, left, delay, duration }) => {
  return (
    <motion.div
      className="absolute bottom-0 rounded-full bg-gray-100"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left,
      }}
      initial={{ y: '100vh', opacity: 0 }}
      animate={{ 
        y: -100, 
        opacity: [0, 0.5, 0] 
      }}
      transition={{
        delay,
        duration,
        repeat: Infinity,
        ease: 'linear'
      }}
    />
  );
};

export default ThoughtBubble; 
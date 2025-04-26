import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type DeviceMockupProps = {
  type: 'phone' | 'laptop';
};

const DeviceMockup: React.FC<DeviceMockupProps> = ({ type }) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSimplified, setShowSimplified] = useState(false);
  
  useEffect(() => {
    // Show confusion emoji after 2 seconds
    const emojiTimer = setTimeout(() => {
      setShowEmoji(true);
    }, 2000);
    
    return () => clearTimeout(emojiTimer);
  }, []);
  
  const handleExplainClick = () => {
    setShowSimplified(true);
  };
  
  const deviceClassName = type === 'phone' 
    ? "w-[280px] h-[560px] rounded-[36px] border-[10px]" 
    : "w-[480px] h-[320px] rounded-[16px] border-[8px]";
  
  const LectureSlide = (
    <div className="p-4 h-full overflow-hidden">
      <h3 className="text-lg font-bold text-center mb-2">Quantum Entanglement Lecture</h3>
      <p className="text-xs mb-2">
        The phenomenon of quantum entanglement occurs when pairs or groups of particles interact in such a way that the quantum state of each particle cannot be described independently of the state of the others, even when separated by large distances.
      </p>
      <div className="text-xs">
        <p className="mb-1">Key equations:</p>
        <p className="font-mono">|Ψ⟩ = (|0⟩A|1⟩B - |1⟩A|0⟩B)/√2</p>
        <p className="font-mono">Bell's inequality: |E(a,b) - E(a,b')| + |E(a',b) + E(a',b')| ≤ 2</p>
      </div>
      <p className="text-xs mt-2">
        The decoherence time for entangled qubits must be considered when implementing quantum algorithms that rely on maintaining coherent superpositions...
      </p>
    </div>
  );
  
  const SimplifiedContent = (
    <div className="p-4 h-full">
      <h3 className="text-lg font-bold text-center mb-3">Quantum Entanglement: Simplified</h3>
      <ul className="text-sm space-y-3">
        <li className="flex items-start">
          <span className="text-accent mr-2">•</span>
          <span>Particles become "connected" so that actions on one affect the other instantly, no matter the distance.</span>
        </li>
        <li className="flex items-start">
          <span className="text-accent mr-2">•</span>
          <span>It's like having two coins that always show opposite sides when flipped, even when separated.</span>
        </li>
        <li className="flex items-start">
          <span className="text-accent mr-2">•</span>
          <span>This is what Einstein called "spooky action at a distance."</span>
        </li>
      </ul>
      <div className="flex justify-center mt-4">
        <div className="text-center text-xs bg-gray-50 p-2 rounded-lg">
          <div className="flex justify-center space-x-8 mb-2">
            <div>Particle A ⟷</div>
            <div>Particle B</div>
          </div>
          <div>Always correlated, no matter the distance!</div>
        </div>
      </div>
    </div>
  );
  
  return (
    <motion.div 
      className={`bg-white border-gray-200 shadow-xl relative overflow-hidden ${deviceClassName}`}
      animate={{ y: [0, -10, 0] }}
      transition={{ 
        y: { repeat: Infinity, duration: 3, ease: "easeInOut" }
      }}
    >
      {/* Device Content */}
      <div className="relative h-full bg-white overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={showSimplified ? "simplified" : "complex"}
            className="h-full"
            initial={{ rotateY: showSimplified ? 90 : 0, opacity: showSimplified ? 0 : 1 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {showSimplified ? SimplifiedContent : LectureSlide}
          </motion.div>
        </AnimatePresence>
        
        {/* Confused Emoji */}
        {showEmoji && !showSimplified && (
          <motion.div 
            className="absolute bottom-16 right-4 text-2xl"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 15
            }}
          >
            😕
          </motion.div>
        )}
        
        {/* Explain Now Button */}
        {!showSimplified && (
          <motion.button
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-accent text-white py-2 px-4 rounded-lg text-sm font-medium"
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)" 
            }}
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              scale: { 
                repeat: Infinity, 
                duration: 2,
                ease: "easeInOut"
              }
            }}
            onClick={handleExplainClick}
          >
            Explain Now
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default DeviceMockup; 
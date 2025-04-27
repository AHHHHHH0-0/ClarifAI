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
    
    // Auto trigger explanation after 5 seconds for demo purposes
    const explainTimer = setTimeout(() => {
      setShowSimplified(true);
    }, 5000);
    
    return () => {
      clearTimeout(emojiTimer);
      clearTimeout(explainTimer);
    };
  }, []);
  
  const handleExplainClick = () => {
    setShowSimplified(true);
  };
  
  // Enhanced device styling with more realistic details
  const deviceClassName = type === 'phone' 
    ? "w-[280px] h-[560px] rounded-[36px] border-[12px]" 
    : "w-[480px] h-[320px] rounded-[16px] border-[10px]";
  
  // Enhanced realistic shadows
  const deviceShadow = "shadow-[0_30px_60px_-10px_rgba(2,62,125,0.3)]";
  
  const LectureSlide = (
    <div className="p-5 h-full overflow-hidden bg-white">
      <div className="flex justify-between items-center mb-3">
        <div className="w-20 h-1.5 bg-border rounded-full"></div>
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-border"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-border"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-border"></div>
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-center mb-3 text-text">Quantum Entanglement Lecture</h3>
      <p className="text-xs mb-3 text-text-muted">
        The phenomenon of quantum entanglement occurs when pairs or groups of particles interact in such a way that the quantum state of each particle cannot be described independently of the state of the others, even when separated by large distances.
      </p>
      <div className="text-xs text-text-muted mb-2">
        <p className="mb-1 font-medium">Key equations:</p>
        <div className="bg-background-light p-2 rounded-md border border-border mb-2">
          <p className="font-mono mb-1">|Ψ⟩ = (|0⟩A|1⟩B - |1⟩A|0⟩B)/√2</p>
          <p className="font-mono">Bell's inequality: |E(a,b) - E(a,b')| + |E(a',b) + E(a',b')| ≤ 2</p>
        </div>
      </div>
      <p className="text-xs mt-2 text-text-muted">
        The decoherence time for entangled qubits must be considered when implementing quantum algorithms that rely on maintaining coherent superpositions...
      </p>
    </div>
  );
  
  const SimplifiedContent = (
    <div className="p-5 h-full bg-white">
      <div className="flex justify-between items-center mb-3">
        <div className="w-20 h-1.5 bg-primary-light/30 rounded-full"></div>
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-light/30"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-primary-light/30"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-primary-light/30"></div>
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-center mb-4 text-primary">Quantum Entanglement: Simplified</h3>
      <ul className="text-sm space-y-4 text-text-muted">
        <li className="flex items-start">
          <span className="text-primary mr-2 text-xl leading-5">•</span>
          <span>Particles become "connected" so that actions on one affect the other instantly, no matter the distance.</span>
        </li>
        <li className="flex items-start">
          <span className="text-primary mr-2 text-xl leading-5">•</span>
          <span>It's like having two coins that always show opposite sides when flipped, even when separated.</span>
        </li>
        <li className="flex items-start">
          <span className="text-primary mr-2 text-xl leading-5">•</span>
          <span>This is what Einstein called "spooky action at a distance."</span>
        </li>
      </ul>
      <div className="flex justify-center mt-5">
        <div className="text-center text-xs bg-background-light p-3 rounded-lg border border-border w-full">
          <div className="flex justify-center space-x-8 mb-2 font-medium text-text">
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                color: ['#374151', '#023E7D', '#374151']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Particle A
            </motion.div>
            <div>⟷</div>
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                color: ['#374151', '#023E7D', '#374151']
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              Particle B
            </motion.div>
          </div>
          <div className="text-text-muted">Always correlated, no matter the distance!</div>
        </div>
      </div>
    </div>
  );
  
  return (
    <motion.div 
      className={`bg-background border-border ${deviceShadow} relative overflow-hidden ${deviceClassName}`}
      animate={{ y: [0, -10, 0] }}
      transition={{ 
        y: { repeat: Infinity, duration: 3, ease: "easeInOut" }
      }}
    >
      {/* Notch for phone */}
      {type === 'phone' && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-5 bg-border rounded-b-xl z-10"></div>
      )}
      
      {/* Device Content */}
      <div className="relative h-full bg-background overflow-hidden rounded-xl">
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
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-white py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-primary-hover shadow-md hover:shadow-lg"
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 4px 12px rgba(2,62,125,0.35)" 
            }}
            animate={{ 
              scale: [1, 1.05, 1],
              boxShadow: [
                "0 4px 6px rgba(2,62,125,0.15)",
                "0 6px 10px rgba(2,62,125,0.25)",
                "0 4px 6px rgba(2,62,125,0.15)"
              ]
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
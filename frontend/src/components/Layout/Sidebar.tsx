import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  conversations: Array<{ id: string; name: string }>;
  selectedConv: string;
  onConversationSelect: (id: string) => void;
}

/**
 * Shared sidebar component for application navigation
 */
const Sidebar: React.FC<SidebarProps> = ({ conversations, selectedConv, onConversationSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <motion.aside
      className="bg-[#3B82F6] border-r border-[#F9FAFB] h-screen flex flex-col"
      animate={{ 
        width: isExpanded ? '240px' : '72px',
      }}
      transition={{ 
        duration: 0.3, 
        ease: "easeInOut" 
      }}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-6 py-4">
        {isExpanded ? (
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <img 
              src="/logo.png" 
              alt="ClarifAI Logo" 
              className="w-6 h-6 mr-2"
            />
            <h1 className="text-white font-semibold text-lg">ClarifAI</h1>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <img 
              src="/logo.png" 
              alt="ClarifAI Logo" 
              className="w-8 h-8"
            />
          </motion.div>
        )}
        <button 
          className="text-white hover:bg-blue-600 rounded-md p-2"
          onClick={toggleSidebar}
        >
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M15.707 4.293a1 1 0 010 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4">
        <ul className="space-y-2">
          <li>
            <Link 
              to="/dashboard" 
              className={`flex items-center p-2 pl-3 rounded-lg ${isActive('/dashboard') ? 'bg-blue-700 text-white' : 'text-white hover:bg-blue-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {isExpanded && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-3"
                >
                    Student Mode                </motion.span>
              )}
            </Link>
          </li>
          <li>
            <Link 
              to="/teach-to-learn" 
              className={`flex items-center p-2 pl-3 rounded-lg ${isActive('/teach-to-learn') ? 'bg-blue-700 text-white' : 'text-white hover:bg-blue-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {isExpanded && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-3"
                >
                  Teach Mode
                </motion.span>
              )}
            </Link>
          </li>
        </ul>
      </nav>

      {/* Conversations Section */}
      <div className="px-4 py-4 border-t border-blue-400">
        <div className="flex items-center justify-between mb-4 px-4">
          {isExpanded && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white text-sm font-medium"
            >
              Conversations
            </motion.span>
          )}
          <button 
            className="text-white hover:bg-blue-600 rounded-full p-1"
            aria-label="New Conversation"
            title="New Conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Conversation List */}
        <ul className="space-y-1">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                className={`w-full flex items-center p-2 pl-3 rounded-lg transition-colors ${selectedConv === conv.id ? 'bg-blue-700 text-white' : 'text-white hover:bg-blue-600'}`}
                onClick={() => onConversationSelect(conv.id)}
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-200 text-blue-800 text-xs font-medium">
                  {conv.name[0]}
                </span>
                {isExpanded && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="ml-3 truncate"
                  >
                    {conv.name}
                  </motion.span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* User Profile / Settings */}
      <div className="px-4 py-4 border-t border-blue-400">
        <button className="w-full flex items-center p-2 pl-3 rounded-lg text-white hover:bg-blue-600">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-800 font-bold text-sm">U</span>
          </div>
          {isExpanded && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-3"
            >
              Profile
            </motion.span>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar; 
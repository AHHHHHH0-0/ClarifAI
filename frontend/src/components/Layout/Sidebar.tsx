import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  conversations: Array<{ id: number; name: string }>;
  selectedConv: number;
  onConversationSelect: (id: number) => void;
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
      className="bg-indigo-800 text-white border-r border-border h-screen flex flex-col"
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
              className="w-12 h-12 mr-2"
            />
            <h1 className="font-heading text-white font-bold text-lg">ClarifAI</h1>
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
          className="text-white hover:bg-primary-hover rounded-md p-2 transition-colors duration-200"
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

      {/* Conversations Section - Moved up to replace Mode Selector */}
      <div className="flex-1 px-4 py-4">
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
            className="text-white hover:bg-primary-hover rounded-full p-1 transition-colors duration-200"
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
                className={`w-full flex items-center p-3 pl-3 rounded-lg transition-colors duration-200 ${selectedConv === conv.id ? 'text-white bg-indigo-600 hover:text-white' : 'text-white hover:bg-indigo-500 hover:text-white'} ${!isExpanded ? 'justify-center': ''}`}
                onClick={() => onConversationSelect(conv.id)}
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white text-primary text-xs font-medium">
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
      <div className="px-4 py-4 border-t border-primary-hover">
        <button className="w-full flex items-center p-2 pl-3 rounded-lg text-white hover:bg-indigo-500 transition-colors duration-200">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <span className="text-primary font-bold text-sm">U</span>
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
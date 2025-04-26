import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';

const mockConversations = [
  { id: 1, name: 'Biology Lecture' },
  { id: 2, name: 'Math Q&A' },
  { id: 3, name: 'History Review' },
];

const mockTranscript = [
  'Welcome to today\'s lecture.',
  'We will discuss the process of photosynthesis.',
  'Photosynthesis occurs in the chloroplasts of plant cells.',
  'Let\'s break down the steps involved...',
];

const DashboardPage: React.FC = () => {
  const [mode, setMode] = useState<'student' | 'teacher'>('student');
  const [selectedConv, setSelectedConv] = useState(1);
  const [transcript, setTranscript] = useState(mockTranscript);
  const navigate = useNavigate();

  const handleModeChange = (newMode: 'student' | 'teacher') => {
    setMode(newMode);
    if (newMode === 'teacher') {
      navigate('/teach-to-learn');
    }
  };

  const handleConfused = () => {
    alert('Explain: Photosynthesis is the process by which green plants convert sunlight into energy.');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        conversations={mockConversations}
        selectedConv={selectedConv}
        onConversationSelect={setSelectedConv}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col relative">
        {/* Mode Switch */}
        <div className="flex gap-0 mt-6 ml-8">
          <button
            className={`px-6 py-2 border border-gray-300 rounded-l-lg font-semibold text-slate-700 bg-white transition ${mode === 'student' ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-gray-100'}`}
            onClick={() => handleModeChange('student')}
          >
            Student
          </button>
          <button
            className={`px-6 py-2 border border-gray-300 rounded-r-lg font-semibold text-slate-700 bg-white transition ${mode === 'teacher' ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-gray-100'}`}
            onClick={() => handleModeChange('teacher')}
          >
            Teacher
          </button>
        </div>
        {/* Main area (empty for now) */}
        <div className="flex-1" />
        {/* Bottom Center Controls */}
        <div className="absolute left-1/2 bottom-8 transform -translate-x-1/2 flex gap-6">
          <button
            className="bg-amber-400 hover:bg-amber-500 text-slate-700 px-6 py-2 rounded-lg font-semibold shadow transition"
            onClick={handleConfused}
          >
            Ask for Clarification
          </button>
        </div>
      </main>

      {/* Transcript Sidebar */}
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <span className="inline-block w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 font-bold">T</span>
          <span className="font-semibold text-slate-700 text-lg">Transcript</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-slate-700 text-sm">
          {transcript.map((line, idx) => (
            <div key={idx} className="mb-2">{line}</div>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default DashboardPage; 
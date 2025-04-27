import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import AudioToTextRecorder from './components/AudioToTextRecorder';

const API_BASE = 'http://localhost:8000/api';

const DashboardPage: React.FC = () => {
  const [mode, setMode] = useState<'student' | 'teacher'>('student');
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch transcript list on load
  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/transcripts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch transcripts');
        const data = await res.json();
        setConversations(data);
        if (data.length > 0) {
          setSelectedConv(data[0]._id);
        }
      } catch (err) {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTranscripts();
  }, []);

  // Fetch transcript details when selectedConv changes
  useEffect(() => {
    if (!selectedConv) return;
    const fetchTranscript = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/transcripts/${selectedConv}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch transcript');
        const data = await res.json();
        // Assume transcript is a string, split by lines for display
        setTranscript(data.text.split('\n').join(' '));
      } catch (err) {
        setTranscript("");
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
  }, [selectedConv]);

  const handleModeChange = (newMode: 'student' | 'teacher') => {
    setMode(newMode);
    if (newMode === 'teacher') {
      navigate('/teach-to-learn');
    }
  };

  const handleConfused = async () => {
    if (!transcript.length) return;
    setExplanation(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: transcript })
      });
      if (!res.ok) throw new Error('Failed to get explanation');
      const data = await res.json();
      setExplanation(data.explanation || 'No explanation available.');
    } catch (err) {
      setExplanation('Failed to get explanation.');
    } finally {
      setLoading(false);
    }
  };

  // Accumulate transcript from AudioToTextRecorder
  const handleTranscript = (newTranscript: string) => {
    setTranscript(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + newTranscript);
  };

  return (
    <div className="flex h-screen bg-background-light">
      {/* Sidebar */}
      <Sidebar 
        conversations={conversations.map((conv) => ({ id: conv._id, name: conv.title || 'Untitled' }))}
        selectedConv={selectedConv || ''}
        onConversationSelect={(id: string) => setSelectedConv(id)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col relative">
        {/* Main area (empty for now) */}
        <div className="flex-1" />
        {/* Bottom Center Controls: AudioToTextRecorder and Ask button */}
        <div className="absolute left-1/2 bottom-8 transform -translate-x-1/2 flex gap-4 items-center">
          <AudioToTextRecorder onTranscript={handleTranscript} />
          <button
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold shadow transition-colors duration-200"
            onClick={handleConfused}
            disabled={loading}
          >
            Ask
          </button>
        </div>
        {/* Gemini Explanation */}
        {explanation && (
          <div className="absolute left-1/2 bottom-24 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-6 max-w-xl w-full z-50">
            <h2 className="font-bold text-lg mb-2 text-primary">Gemini Explanation</h2>
            <div className="text-text-muted whitespace-pre-line">{explanation}</div>
            <button className="mt-4 px-4 py-2 bg-primary text-white rounded" onClick={() => setExplanation(null)}>Close</button>
          </div>
        )}
      </main>

      {/* Mode Switch beside transcript box (not within) */}
      <div className="fixed top-16 right-[500px] z-20 flex gap-0">
        <button
          className={`px-6 py-2 border border-border rounded-l-lg font-semibold transition-colors duration-200 ${mode === 'student' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-text hover:bg-gray-50'}`}
          onClick={() => handleModeChange('student')}
        >
          Student
        </button>
        <button
          className={`px-6 py-2 border border-border rounded-r-lg font-semibold transition-colors duration-200 ${mode === 'teacher' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-text hover:bg-gray-50'}`}
          onClick={() => handleModeChange('teacher')}
        >
          Teacher
        </button>
      </div>

      {/* Transcript panel on the right */}
      <aside className="w-96 min-w-[320px] max-w-[500px] h-full bg-white border-l border-border flex flex-col justify-start items-center shadow-lg">
        <div className="w-full px-8 py-12">
          <h2 className="font-bold text-xl mb-4 text-primary">Transcript</h2>
          <div className="text-text-muted whitespace-pre-line min-h-[120px]">
            {transcript.trim().length > 0 ? (
              <div>{transcript}</div>
            ) : (
              <span className="text-gray-400">Start speaking to see the transcript...</span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default DashboardPage; 
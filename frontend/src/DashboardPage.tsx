import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./components/Layout/Sidebar";
import { Routes, Route } from "react-router-dom";
import {
  useConceptFlag,
  ConceptFlagData,
  ExplanationData,
} from "./hooks/useConceptFlag";

const mockConversations = [
  { id: 1, name: "Biology Lecture" },
  { id: 2, name: "Math Q&A" },
  { id: 3, name: "History Review" },
];

const mockTranscript = [
  "Welcome to today's lecture.",
  "We will discuss the process of photosynthesis.",
  "Photosynthesis occurs in the chloroplasts of plant cells.",
  "Let's break down the steps involved...",
];

// Mock current concept for demo purposes
const mockCurrentConcept: ConceptFlagData = {
  concept_name: "Photosynthesis",
  context: "Photosynthesis occurs in the chloroplasts of plant cells.",
  difficulty_level: 3,
};

const DashboardPage: React.FC = () => {
  const [mode, setMode] = useState<"student" | "teacher">("student");
  const [selectedConv, setSelectedConv] = useState(1);
  const [transcript, setTranscript] = useState(mockTranscript);
  const [currentConcept, setCurrentConcept] =
    useState<ConceptFlagData>(mockCurrentConcept);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const navigate = useNavigate();

  // Get user ID from localStorage or use a mock value
  const userId = localStorage.getItem("userId") || "user123";

  // Use our concept flag hook
  const { flagConcept, isConnected, isLoading } = useConceptFlag({
    onExplanation: (data: ExplanationData) => {
      setExplanation(data);
      setIsExplaining(true);
    },
    onError: (error: Error) => {
      console.error("Flagging error:", error);
      alert("Error getting explanation: " + error.message);
    },
  });

  const handleModeChange = (newMode: "student" | "teacher") => {
    setMode(newMode);
    if (newMode === "teacher") {
      navigate("/teach-to-learn");
    }
  };

  const handleConfused = () => {
    if (!currentConcept) {
      alert("No concept detected in the current conversation.");
      return;
    }

    // Flag the current concept for explanation
    flagConcept({
      concept_name: currentConcept.concept_name,
      context: currentConcept.context,
      user_id: userId,
      lecture_id: `lecture-${selectedConv}`,
      difficulty_level: currentConcept.difficulty_level,
    });
  };

  const closeExplanation = () => {
    setIsExplaining(false);
    setExplanation(null);
  };

  return (
    <div className="flex h-screen bg-background-light">
      {/* Sidebar */}
      <Sidebar
        conversations={mockConversations}
        selectedConv={selectedConv}
        onConversationSelect={setSelectedConv}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col relative">
        {/* Mode Switch */}
        <div className="flex justify-end gap-0 mt-6 mr-8">
          <button
            className={`px-6 py-2 border border-border rounded-l-lg font-semibold transition-colors duration-200 ${
              mode === "student"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-text hover:bg-gray-50"
            }`}
            onClick={() => handleModeChange("student")}
          >
            Student
          </button>
          <button
            className={`px-6 py-2 border border-border rounded-r-lg font-semibold transition-colors duration-200 ${
              mode === "teacher"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-text hover:bg-gray-50"
            }`}
            onClick={() => handleModeChange("teacher")}
          >
            Teacher
          </button>
        </div>
        {/* Main area (empty for now) */}
        <div className="flex-1" />
        {/* Bottom Center Controls */}
        <div className="absolute left-1/2 bottom-8 transform -translate-x-1/2 flex gap-6">
          <button
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold shadow transition-colors duration-200"
            onClick={handleConfused}
            disabled={!isConnected || isLoading}
            title={!isConnected ? "Connecting to server..." : undefined}
          >
            Ask
          </button>
        </div>
      </main>

      {/* Transcript Sidebar */}
      <aside className="w-80 bg-background border-l border-border flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="inline-block w-6 h-6 bg-indigo-600/10 rounded-full flex items-center justify-center text-indigo-600 font-bold">
            T
          </span>
          <span className="font-heading font-bold text-text text-lg">
            Transcript
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-text-muted text-sm">
          {transcript.map((line, idx) => (
            <div key={idx} className="mb-2">
              {line}
            </div>
          ))}
        </div>
      </aside>

      {/* Explanation Modal */}
      {isExplaining && explanation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text">
                {currentConcept.concept_name}
              </h2>
              <button
                onClick={closeExplanation}
                className="text-text-muted hover:text-text"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Explanation</h3>
              <p className="text-text-muted">{explanation.explanation}</p>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Examples</h3>
              <ul className="list-disc pl-5">
                {explanation.examples.map((example: string, idx: number) => (
                  <li key={idx} className="text-text-muted mb-1">
                    {example}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Common Misconceptions</h3>
              <ul className="list-disc pl-5">
                {explanation.misconceptions.map(
                  (misconception: string, idx: number) => (
                    <li key={idx} className="text-text-muted mb-1">
                      {misconception}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Related Concepts</h3>
              <div className="flex flex-wrap gap-2">
                {explanation.related_concepts.map(
                  (concept: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-primary-light/10 text-primary px-2 py-1 rounded-full text-sm"
                    >
                      {concept}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

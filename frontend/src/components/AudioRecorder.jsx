import React, { useState, useEffect } from "react";
import { useDeepgramAudio } from "../hooks/useDeepgramAudio";

const AudioRecorder = ({ userId, lectureId }) => {
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [conceptList, setConceptList] = useState([]);
  const [currentConceptName, setCurrentConceptName] = useState(null);

  const {
    connect,
    startRecording,
    stopRecording,
    isRecording,
    isConnected,
    transcript,
    concepts,
    currentConcept,
    error,
    sessionId,
  } = useDeepgramAudio({
    userId,
    lectureId,
    onTranscript: (newTranscript, isFinal) => {
      if (isFinal && newTranscript) {
        setTranscriptHistory((prev) => [...prev, newTranscript]);
      }
    },
    onConcepts: (newConcepts) => {
      setConceptList(newConcepts);
    },
  });

  useEffect(() => {
    // Connect to WebSocket on component mount
    connect();

    // Clean up is handled by the hook
  }, [connect]);

  // Update current concept when it changes
  useEffect(() => {
    if (currentConcept && currentConcept.concept_name) {
      setCurrentConceptName(currentConcept.concept_name);
    }
  }, [currentConcept]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const renderConceptItem = (concept, index) => {
    const difficultyColor =
      concept.difficulty_level > 3
        ? "text-red-700"
        : concept.difficulty_level > 1
        ? "text-yellow-500"
        : "text-green-500";

    return (
      <div
        key={index}
        className={`p-2 mb-2 rounded ${
          concept.is_current ? "bg-blue-100" : "bg-gray-100"
        }`}
      >
        <h3 className="font-bold">
          {concept.concept_name || "Unnamed Concept"}
        </h3>
        <p className="text-sm text-gray-600">
          {concept.text_snippet || "No snippet available"}
        </p>
        <span className={difficultyColor}>
          Difficulty: {concept.difficulty_level || 3}/5
        </span>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ClarifAI Audio Recorder</h1>

      {/* Connection status */}
      <div className="mb-4">
        <span
          className={`inline-block w-3 h-3 rounded-full mr-2 ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        ></span>
        <span>{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-2 mb-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {/* Record button */}
      <button
        onClick={toggleRecording}
        className={`px-4 py-2 rounded font-bold ${
          isRecording ? "bg-red-500 text-white" : "bg-blue-500 text-white"
        }`}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Live transcript */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Live Transcript</h2>
          <div className="p-4 bg-gray-100 rounded min-h-[200px]">
            <p>{transcript}</p>
          </div>

          {/* Transcript history */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Transcript History</h3>
            <div className="max-h-[300px] overflow-y-auto">
              {transcriptHistory.map((text, index) => (
                <div key={index} className="p-2 mb-2 bg-gray-50 rounded">
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Concepts */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Detected Concepts</h2>

          {/* Current concept */}
          {currentConceptName && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Current Topic:</h3>
              <div className="p-2 bg-blue-100 rounded">
                {currentConceptName}
              </div>
            </div>
          )}

          {/* All concepts */}
          <div className="max-h-[400px] overflow-y-auto">
            {conceptList.length > 0 ? (
              conceptList.map(renderConceptItem)
            ) : (
              <p className="text-gray-500">No concepts detected yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioRecorder;

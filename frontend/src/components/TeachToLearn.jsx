import React, { useState, useEffect, useRef } from "react";
import { useDeepgramAudio } from "../hooks/useDeepgramAudio";

const TeachToLearn = ({ userId }) => {
  const [isTeaching, setIsTeaching] = useState(false);
  const [topic, setTopic] = useState("");
  const [understandingScore, setUnderstandingScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPendingUserResponse, setIsPendingUserResponse] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [error, setError] = useState(null);

  const teachWsRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  // Set up Web Speech API
  useEffect(() => {
    // Check if browser supports speech synthesis
    if ("speechSynthesis" in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    } else {
      setError(
        "Your browser does not support speech synthesis. Please try Chrome or Edge."
      );
    }

    return () => {
      // Cancel any ongoing speech when component unmounts
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  // Setup DeepGram for audio recording with consolidated endpoint
  const {
    connect: connectToAudio,
    startRecording,
    stopRecording,
    isRecording,
    isConnected: isAudioConnected,
    error: audioError,
    transcript,
  } = useDeepgramAudio({
    apiUrl: "ws://localhost:8002/ws/audio-to-text",
    userId,
    mode: "teach", // Use teach mode for the audio processing
    onTranscript: (newTranscript, isFinal) => {
      // If final transcript, forward to teaching WebSocket
      if (
        isFinal &&
        teachWsRef.current &&
        teachWsRef.current.readyState === WebSocket.OPEN
      ) {
        teachWsRef.current.send(
          JSON.stringify({
            transcript: newTranscript,
            is_final: true,
          })
        );
      }
    },
  });

  // Speak text using Web Speech API
  const speakText = (text) => {
    if (!speechSynthesisRef.current) return;

    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Set properties
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Select voice
    const voices = speechSynthesisRef.current.getVoices();
    const preferredVoice = voices.find(
      (voice) =>
        voice.name.includes("Google") ||
        voice.name.includes("Female") ||
        voice.name.includes("Samantha")
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Start speaking
    setIsAISpeaking(true);
    speechSynthesisRef.current.speak(utterance);

    // State management during/after speech
    setIsPendingUserResponse(false);
    utterance.onend = () => {
      setIsAISpeaking(false);
      setIsPendingUserResponse(true);
    };
  };

  // Connect to teach-to-learn WebSocket for the teaching logic
  const connectToTeachToLearn = () => {
    if (!topic) {
      setError("Please enter a topic to learn about");
      return;
    }

    try {
      // Connect to the teaching WebSocket
      const wsUrl = "ws://localhost:8002/ws/teach-to-learn";
      const ws = new WebSocket(wsUrl);
      teachWsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);

        // Send initialization data
        ws.send(
          JSON.stringify({
            user_id: userId,
            topic: topic,
          })
        );

        // Also connect to audio WebSocket for recording
        connectToAudio();
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === "error") {
          setError(data.message);
          return;
        }

        // Update score if provided
        if (data.understanding_score !== undefined) {
          setUnderstandingScore(data.understanding_score);
        }

        // Handle complete status
        if (data.status === "complete") {
          setIsComplete(true);
          stopRecording();

          // Speak completion message
          if (data.text && data.use_client_tts) {
            speakText(data.text);
          }
          return;
        }

        // Handle response or question with text-to-speech
        if (
          (data.status === "response" || data.status === "question") &&
          data.text &&
          data.use_client_tts
        ) {
          // Stop any current recording while AI is speaking
          if (isRecording) {
            stopRecording();
          }

          // Speak the text
          speakText(data.text);

          // Update complete status if provided
          if (data.is_complete !== undefined) {
            setIsComplete(data.is_complete);
          }
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsTeaching(false);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error. Please try again.");
        setIsConnected(false);
      };

      setIsTeaching(true);
    } catch (err) {
      console.error("Error connecting to WebSocket:", err);
      setError("Failed to connect. Please try again.");
    }
  };

  // Handle start/stop of recording
  const handleSpeakToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Handle start/stop button click
  const handleTeachToLearnToggle = () => {
    if (isTeaching) {
      // Stop the teaching session
      if (
        teachWsRef.current &&
        teachWsRef.current.readyState === WebSocket.OPEN
      ) {
        teachWsRef.current.send(JSON.stringify({ stop: true }));
      }
      stopRecording();
      setIsTeaching(false);
    } else {
      // Start a new teaching session
      connectToTeachToLearn();
    }
  };

  // Progress bar color based on score
  const getProgressColor = () => {
    if (understandingScore < 30) return "bg-red-500";
    if (understandingScore < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="p-4 max-w-3xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Teach-to-Learn Mode</h1>

      {/* Connection status */}
      <div className="flex items-center mb-4">
        <span
          className={`inline-block w-3 h-3 rounded-full mr-2 ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        ></span>
        <span>{isConnected ? "Connected" : "Disconnected"}</span>

        {isRecording && (
          <span className="ml-4 text-red-500 animate-pulse">Recording...</span>
        )}

        {isAISpeaking && (
          <span className="ml-4 text-purple-500">AI Speaking...</span>
        )}
      </div>

      {/* Error message */}
      {(error || audioError) && (
        <div className="p-2 mb-4 bg-red-100 text-red-700 rounded">
          Error: {error || audioError}
        </div>
      )}

      {/* Topic input (only when not teaching) */}
      {!isTeaching && (
        <div className="mb-4">
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            What topic would you like to learn about?
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter a topic (e.g., Neural Networks, Quantum Physics)"
            disabled={isTeaching}
          />
        </div>
      )}

      {/* Understanding progress bar */}
      {isTeaching && (
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Understanding Progress</span>
            <span className="text-sm font-medium">{understandingScore}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${understandingScore}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Start/Stop session button */}
      <button
        onClick={handleTeachToLearnToggle}
        disabled={isTeaching && !isConnected}
        className={`px-4 py-2 rounded-md font-medium text-white ${
          isTeaching
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isTeaching ? "Stop Learning Session" : "Start Learning Session"}
      </button>

      {/* Speak Now button (only shown when in a teaching session and not recording) */}
      {isTeaching && isPendingUserResponse && !isAISpeaking && (
        <button
          onClick={handleSpeakToggle}
          className={`ml-4 px-4 py-2 rounded-md font-medium text-white ${
            isRecording
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isRecording ? "Stop Speaking" : "Speak Now"}
        </button>
      )}

      {/* Completion message */}
      {isComplete && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
          <p className="font-medium">Learning complete! 🎉</p>
          <p>You've reached a good understanding of this topic.</p>
        </div>
      )}
    </div>
  );
};

export default TeachToLearn;

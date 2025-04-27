import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Layout/Sidebar";
import { auth } from "./firebase";
import { speak } from "./utils/tts";

// State for lectures fetched from backend
interface LectureItem {
  id: string;
  name: string;
}
const WS_LECTURES_URL =
  (process.env.REACT_APP_WS_URL || "ws://localhost:8000") + "/ws/lectures";
const WS_PROCESS_URL =
  (process.env.REACT_APP_WS_URL || "ws://localhost:8000") + "/ws/process-audio";

/**
 * TeachToLearn page - Teacher mode interface with speech visualization
 */
const TeachToLearn: React.FC = () => {
  const [mode, setMode] = useState<"student" | "teacher">("teacher");
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [selectedConv, setSelectedConv] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [firstName, setFirstName] = useState("Student");
  const [messages, setMessages] = useState<
    { sender: "user" | "ai"; content: string }[]
  >([]);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const navigate = useNavigate();

  // Get user's first name from Firebase on mount
  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.displayName) {
      setFirstName(user.displayName.split(" ")[0]);
    }
  }, []);

  // Fetch lectures on mount
  useEffect(() => {
    const ws = new WebSocket(WS_LECTURES_URL);
    ws.onopen = () => {
      const user = auth.currentUser;
      if (user) ws.send(JSON.stringify({ user_id: user.uid }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "success" && data.lectures) {
          const list = data.lectures.map((lec: any) => ({
            id: lec.id,
            name: lec.title,
          }));
          setLectures(list);
          if (list.length) setSelectedConv(list[0].id);
        }
      } catch {}
    };
    return () => ws.close();
  }, []);

  // Handle mode switch
  const handleModeChange = (newMode: "student" | "teacher") => {
    setMode(newMode);
    if (newMode === "student") {
      navigate("/dashboard");
    }
  };

  // Toggle speaking state for demo purposes
  const toggleSpeaking = async () => {
    if (!isSpeaking) {
      // Start recording & connect WebSocket
      const user = auth.currentUser;
      const ws = new WebSocket(WS_PROCESS_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send(
          JSON.stringify({ user_id: user?.uid, lecture_id: selectedConv })
        );
        setIsSpeaking(true);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.transcript) {
            setMessages((prev) => [
              ...prev,
              { sender: "ai", content: data.transcript },
            ]);
            speak(data.transcript);
          }
        } catch {}
      };
      // Start media recorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          event.data.arrayBuffer().then((buffer) => ws.send(buffer));
        }
      };
    } else {
      // Stop recording
      mediaRecorderRef.current?.stop();
      wsRef.current?.close();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="flex h-screen bg-background-light">
      {/* Sidebar */}
      <Sidebar
        conversations={lectures}
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

        {/* Main area - Greeting then chat bubble based on speaking state */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {!isSpeaking ? (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: isSpeaking ? 0 : 1 }}
              transition={{ duration: 1 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-2">Hello {firstName}!</h2>
              <p className="text-lg text-gray-600">Get ready to learn.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="w-full max-w-xl h-64 bg-white shadow-lg rounded-lg p-4 mb-6 overflow-y-auto flex flex-col"
            >
              {/* Chatbox content */}
              <div className="flex-1 overflow-y-auto">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={
                      msg.sender === "ai"
                        ? "text-left text-indigo-600"
                        : "text-right text-gray-800"
                    }
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {/* Centered animated bubble */}
          <div className="relative mt-6">
            <motion.div
              className="relative cursor-pointer"
              onClick={toggleSpeaking}
              initial={{ scale: 1 }}
              animate={{
                scale: isSpeaking
                  ? [1, 1.15, 1.05, 1.1, 1]
                  : [1, 1.06, 1.02, 1.04, 1],
                borderRadius: isSpeaking
                  ? ["50%", "45%", "48%", "46%", "50%"]
                  : ["50%", "49%", "50%", "48%", "50%"],
              }}
              transition={{
                repeat: Infinity,
                duration: isSpeaking ? 2.5 : 4,
                ease: "easeInOut",
              }}
            >
              <motion.div
                className="w-40 h-40 md:w-56 md:h-56 rounded-full shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #818CF8, #4F46E5)",
                }}
                animate={{
                  background: [
                    "linear-gradient(135deg, #818CF8, #4F46E5)",
                    "linear-gradient(225deg, #818CF8, #4F46E5)",
                    "linear-gradient(315deg, #818CF8, #4F46E5)",
                    "linear-gradient(45deg, #818CF8, #4F46E5)",
                    "linear-gradient(135deg, #818CF8, #4F46E5)",
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 8,
                  ease: "linear",
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* Bottom controls - Icon buttons */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
          <div className="flex justify-center items-center gap-6">
            {/* Microphone button */}
            <button
              className="w-12 h-12 rounded-full bg-background hover:bg-border flex items-center justify-center transition-colors duration-200 shadow-md"
              onClick={toggleSpeaking}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeachToLearn;

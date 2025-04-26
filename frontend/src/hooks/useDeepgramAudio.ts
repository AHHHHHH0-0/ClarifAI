import { useState, useEffect, useCallback, useRef } from "react";

interface DeepgramOptions {
  apiUrl?: string;
  userId?: string;
  lectureId?: string;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onConcepts?: (concepts: any[]) => void;
  onError?: (error: any) => void;
  onConnect?: (sessionId: string) => void;
}

export const useDeepgramAudio = (options: DeepgramOptions = {}) => {
  const {
    apiUrl = "ws://localhost:8000/ws/audio-to-text",
    userId,
    lectureId,
    onTranscript,
    onConcepts,
    onError,
    onConnect,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [concepts, setConcepts] = useState<any[]>([]);
  const [currentConcept, setCurrentConcept] = useState<any | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      // Close existing connection if any
      if (socketRef.current) {
        socketRef.current.close();
      }

      // Create new WebSocket connection
      const socket = new WebSocket(apiUrl);
      socketRef.current = socket;

      // Set up event handlers
      socket.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        setError(null);

        // Send initialization data with user and lecture info
        socket.send(
          JSON.stringify({
            user_id: userId,
            lecture_id: lectureId,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle initial connection confirmation
          if (data.status === "connected" && data.session_id) {
            setSessionId(data.session_id);
            if (onConnect) onConnect(data.session_id);
          }

          // Handle transcription results
          if (data.transcript !== undefined) {
            const newTranscript = data.transcript;
            const isFinal = data.is_final === true;

            if (isFinal && data.full_transcript) {
              setTranscript(data.full_transcript);
            }

            if (onTranscript) onTranscript(newTranscript, isFinal);
          }

          // Handle concepts if provided
          if (data.concepts && Array.isArray(data.concepts)) {
            setConcepts(data.concepts);
            if (onConcepts) onConcepts(data.concepts);
          }

          // Handle current concept
          if (data.current_concept) {
            setCurrentConcept(data.current_concept);
          }

          // Handle errors
          if (data.status === "error") {
            console.error("WebSocket error:", data.message);
            setError(data.message);
            if (onError) onError(data.message);
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      socket.onerror = (e) => {
        console.error("WebSocket error:", e);
        setError("WebSocket connection error");
        setIsConnected(false);
        if (onError) onError(e);
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
      };

      return true;
    } catch (err) {
      console.error("Error connecting to WebSocket:", err);
      setError("Failed to connect to WebSocket");
      setIsConnected(false);
      if (onError) onError(err);
      return false;
    }
  }, [apiUrl, userId, lectureId, onTranscript, onConcepts, onError, onConnect]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Ensure we have a WebSocket connection
      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        const connected = await connect();
        if (!connected) return;
      }

      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Handle audio data
      mediaRecorder.ondataavailable = async (event) => {
        if (
          event.data.size > 0 &&
          socketRef.current?.readyState === WebSocket.OPEN
        ) {
          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = (reader.result as string).split(",")[1];

            // Send to WebSocket
            socketRef.current?.send(
              JSON.stringify({
                audio: base64Audio,
              })
            );
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Start recording with 250ms intervals for real-time experience
      mediaRecorder.start(250);
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to access microphone");
      if (onError) onError(err);
    }
  }, [connect, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    stopRecording();
    setIsConnected(false);
    setSessionId(null);
  }, [stopRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    startRecording,
    stopRecording,
    isRecording,
    isConnected,
    error,
    transcript,
    concepts,
    currentConcept,
    sessionId,
  };
};

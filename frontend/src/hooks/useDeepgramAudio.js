import { useState, useEffect, useCallback, useRef } from "react";

export const useDeepgramAudio = (options = {}) => {
  const {
    apiUrl = "ws://localhost:8002/ws/audio-to-text",
    userId,
    lectureId,
    mode = "lecture",
    onTranscript,
    onConcepts,
    onError,
    onConnect,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [concepts, setConcepts] = useState([]);
  const [currentConcept, setCurrentConcept] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const lastActionTimeRef = useRef(0);
  const DEBOUNCE_TIME = 500; // ms

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (isConnecting) return false; // Prevent multiple simultaneous connections

    setIsConnecting(true);

    try {
      // Clear any existing timeouts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      // Close existing connection if any
      if (socketRef.current) {
        socketRef.current.close();
      }

      console.log("Creating new WebSocket connection to", apiUrl);
      // Create new WebSocket connection
      const socket = new WebSocket(apiUrl);
      socketRef.current = socket;

      // Promise to wait for connection to be established
      return new Promise((resolve) => {
        // Set up event handlers
        socket.onopen = () => {
          console.log("WebSocket connection established");
          setIsConnected(true);
          setError(null);
          setIsConnecting(false);

          // Send initialization data with user and lecture info
          try {
            socket.send(
              JSON.stringify({
                user_id: userId,
                lecture_id: lectureId,
                mode: mode,
              })
            );
            resolve(true);
          } catch (err) {
            console.error("Error sending initial data:", err);
            setError("Failed to send initial data");
            setIsConnected(false);
            setIsConnecting(false);
            resolve(false);
          }
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
          setIsConnecting(false);
          if (onError) onError(e);
          resolve(false);
        };

        socket.onclose = (e) => {
          console.log("WebSocket connection closed", e.code, e.reason);
          setIsConnected(false);
          setIsConnecting(false);
          resolve(false);
        };

        // Set a timeout in case the connection hangs
        connectionTimeoutRef.current = setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) {
            console.error("WebSocket connection timeout");
            setError("WebSocket connection timeout");
            setIsConnected(false);
            setIsConnecting(false);
            socket.close();
            resolve(false);
          }
        }, 5000);
      });
    } catch (err) {
      console.error("Error connecting to WebSocket:", err);
      setError("Failed to connect to WebSocket");
      setIsConnected(false);
      setIsConnecting(false);
      if (onError) onError(err);
      return false;
    }
  }, [
    apiUrl,
    userId,
    lectureId,
    mode,
    onTranscript,
    onConcepts,
    onError,
    onConnect,
    isConnecting,
  ]);

  // Stop recording function (defined before startRecording to avoid circular dependency)
  const stopRecording = useCallback(() => {
    const now = Date.now();
    // Debounce to prevent rapid toggling
    if (now - lastActionTimeRef.current < DEBOUNCE_TIME) {
      console.log("Debouncing stop recording action");
      return;
    }
    lastActionTimeRef.current = now;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping media recorder:", err);
      }
    }

    // Release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    const now = Date.now();
    // Debounce to prevent rapid toggling
    if (now - lastActionTimeRef.current < DEBOUNCE_TIME) {
      console.log("Debouncing start recording action");
      return;
    }
    lastActionTimeRef.current = now;

    try {
      // Stop any existing recording
      if (isRecording) {
        stopRecording();
        // Add a small delay to ensure previous recording is stopped
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Ensure we have a WebSocket connection
      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        console.log("WebSocket not open, attempting to connect...");
        setIsRecording(false); // Reset recording state during connection attempt

        const connected = await connect();
        if (!connected) {
          console.error("Could not establish WebSocket connection");
          setError("Could not establish WebSocket connection");
          return;
        }

        // Add a delay to ensure connection is stable
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Double-check connection state
        if (
          !socketRef.current ||
          socketRef.current.readyState !== WebSocket.OPEN
        ) {
          console.error("WebSocket connection not ready after waiting");
          setError("WebSocket connection not ready");
          return;
        }
      }

      console.log("Attempting to get audio stream");
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Handle audio data
      mediaRecorder.ondataavailable = async (event) => {
        try {
          if (event.data.size > 0) {
            // Check socket state before processing data
            if (
              !socketRef.current ||
              socketRef.current.readyState !== WebSocket.OPEN
            ) {
              console.warn("WebSocket not in OPEN state, skipping audio data");
              return;
            }

            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              try {
                const base64Audio = reader.result.split(",")[1];

                // Double-check socket state right before sending
                if (
                  socketRef.current &&
                  socketRef.current.readyState === WebSocket.OPEN
                ) {
                  socketRef.current.send(
                    JSON.stringify({
                      audio: base64Audio,
                    })
                  );
                } else {
                  console.warn("WebSocket closed while processing audio data");
                }
              } catch (err) {
                console.error("Error sending audio data:", err);
              }
            };
            reader.readAsDataURL(event.data);
          }
        } catch (err) {
          console.error("Error in ondataavailable:", err);
        }
      };

      // Set up error and state change handlers for media recorder
      mediaRecorder.onerror = (err) => {
        console.error("MediaRecorder error:", err);
        stopRecording();
      };

      // Start recording with 250ms intervals for real-time experience
      mediaRecorder.start(250);
      console.log("MediaRecorder started successfully");
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to access microphone");
      setIsRecording(false);
      if (onError) onError(err);
    }
  }, [connect, stopRecording, isRecording, onError]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    stopRecording();
    setIsConnected(false);
    setSessionId(null);
    setIsConnecting(false);
  }, [stopRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Special function for process mode to send transcript text directly
  const processTranscript = useCallback(async (transcript, isFinal = false) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return false;
    }

    try {
      socketRef.current.send(
        JSON.stringify({
          transcript,
          is_final: isFinal,
        })
      );
      return true;
    } catch (err) {
      console.error("Error sending transcript for processing:", err);
      return false;
    }
  }, []);

  return {
    connect,
    disconnect,
    startRecording,
    stopRecording,
    isRecording,
    isConnected,
    error,
    sessionId,
    transcript,
    concepts,
    currentConcept,
    processTranscript,
  };
};

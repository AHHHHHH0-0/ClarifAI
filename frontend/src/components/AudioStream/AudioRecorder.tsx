import React, { useState, useEffect, useCallback } from "react";
import { socket } from "../../services/socket";
import { cn } from "../../utils/cn";
import { AudioStreamState } from "../../types";

export const AudioRecorder: React.FC = () => {
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    duration: 0,
  });
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socket.emit("audio-chunk", event.data);
        }
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setState((prev) => ({ ...prev, isRecording: true }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Error accessing microphone",
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setState((prev) => ({ ...prev, isRecording: false }));
    }
  }, [mediaRecorder]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.isRecording) {
      interval = setInterval(() => {
        setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.isRecording]);

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <button
        onClick={state.isRecording ? stopRecording : startRecording}
        className={cn(
          "px-6 py-3 rounded-full font-semibold transition-all duration-300",
          state.isRecording
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse-slow"
            : "bg-primary-500 hover:bg-primary-600 text-white"
        )}
      >
        {state.isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      {state.isRecording && (
        <div className="text-gray-600">
          Recording: {Math.floor(state.duration / 60)}:
          {(state.duration % 60).toString().padStart(2, "0")}
        </div>
      )}

      {state.error && <div className="text-red-500 text-sm">{state.error}</div>}
    </div>
  );
};

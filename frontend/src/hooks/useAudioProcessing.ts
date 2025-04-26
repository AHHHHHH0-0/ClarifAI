import { useState, useCallback, useEffect } from "react";
import { socket } from "../services/socket";

interface AudioProcessingOptions {
  onProcessed?: (text: string) => void;
  onError?: (error: Error) => void;
}

export const useAudioProcessing = (options: AudioProcessingOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const processAudioChunk = useCallback(
    async (chunk: Blob) => {
      try {
        setIsProcessing(true);

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(chunk);

        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          socket.emit("process-audio", { audio: base64Audio });
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        options.onError?.(error);
      } finally {
        setIsProcessing(false);
      }
    },
    [options]
  );

  useEffect(() => {
    socket.on("audio-processed", (result) => {
      options.onProcessed?.(result.text);
    });

    return () => {
      socket.off("audio-processed");
    };
  }, [options]);

  return {
    processAudioChunk,
    isProcessing,
    error,
  };
};

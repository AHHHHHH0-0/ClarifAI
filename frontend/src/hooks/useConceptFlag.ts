import { useState, useEffect, useCallback, useRef } from "react";

// Interface for concept data
export interface ConceptFlagData {
  concept_name: string;
  context: string;
  user_id?: string;
  lecture_id?: string;
  transcript_id?: string;
  difficulty_level?: number;
}

// Interface for explanation response
export interface ExplanationData {
  explanation: string;
  examples: string[];
  misconceptions: string[];
  related_concepts: string[];
  timestamp?: string;
  status?: string;
}

// Interface for the raw response from the /ws/flag-concept endpoint
interface FlagConceptResponse {
  explanation: ExplanationData; // nested explanation object
  timestamp?: string;
  status: string;
  message?: string;
}

// Hook options interface
interface ConceptFlagOptions {
  onExplanation?: (data: ExplanationData) => void;
  onError?: (error: Error) => void;
}

// Hook return interface
interface ConceptFlagHook {
  flagConcept: (conceptData: ConceptFlagData) => void;
  isConnected: boolean;
  isLoading: boolean;
}

/**
 * Hook for connecting to the concept flagging WebSocket endpoint.
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onExplanation - Callback for when an explanation is received
 * @param {Function} options.onError - Callback for when an error occurs
 * @returns {Object} - Functions and state for flagging concepts
 */
export const useConceptFlag = ({
  onExplanation,
  onError,
}: ConceptFlagOptions = {}): ConceptFlagHook => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = useCallback(() => {
    // Clear any existing connection
    if (webSocket) {
      webSocket.close();
    }

    // Determine if we're in a development or production environment
    const isProduction = window.location.hostname !== "localhost";

    // In dev, use localhost; in prod use the current hostname
    const wsHost = isProduction ? window.location.host : "localhost:8001";

    // Use secure WebSockets if the page was loaded over HTTPS
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    // Construct the WebSocket URL
    const wsUrl = `${wsProtocol}//${wsHost}/ws/flag-concept`;

    console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Clear any reconnect timeout
        if (reconnectTimeoutRef.current) {
          window.clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onclose = (event) => {
        console.log(
          `WebSocket closed with code: ${event.code}, reason: ${event.reason}`
        );
        setIsConnected(false);

        // Try to reconnect unless we've hit the max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const timeout = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(
            `Attempting to reconnect in ${timeout / 1000} seconds...`
          );

          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, timeout);
        } else {
          console.error("Maximum reconnection attempts reached");
          onError?.(
            new Error(
              "Could not establish WebSocket connection after multiple attempts"
            )
          );
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        onError?.(
          new Error(
            "WebSocket connection error - check developer console for details"
          )
        );
      };

      ws.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        setIsLoading(false);

        let msg: FlagConceptResponse;
        try {
          msg = JSON.parse(event.data);
          console.log("Parsed WebSocket message:", msg);
        } catch (parseErr) {
          console.error(
            "Error parsing WebSocket message:",
            parseErr,
            "Raw data:",
            event.data
          );
          onError?.(parseErr as Error);
          return;
        }

        if (msg.status === "error") {
          console.error("Error from server:", msg.message);
          onError?.(new Error(msg.message || "Unknown error"));
        } else {
          console.log("Received explanation:", msg.explanation);
          onExplanation?.(msg.explanation);
        }
      };

      setWebSocket(ws);
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      onError?.(err as Error);
    }
  }, [onExplanation, onError, webSocket]);

  // Set up WebSocket connection and cleanup
  useEffect(() => {
    console.log("Initializing WebSocket connection");
    connectWebSocket();

    // Cleanup function
    return () => {
      console.log("Cleaning up WebSocket connection");
      if (webSocket) {
        webSocket.close();
      }

      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  /**
   * Flag a concept for explanation
   */
  const flagConcept = useCallback(
    (conceptData: ConceptFlagData) => {
      if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not connected, cannot send data");
        onError?.(new Error("WebSocket not connected"));
        return;
      }

      try {
        const serializedData = JSON.stringify(conceptData);
        console.log("Sending concept data:", serializedData);
        setIsLoading(true);
        webSocket.send(serializedData);
      } catch (err) {
        console.error("Error sending data via WebSocket:", err);
        setIsLoading(false);
        onError?.(err as Error);
      }
    },
    [webSocket, onError]
  );

  return { flagConcept, isConnected, isLoading };
};

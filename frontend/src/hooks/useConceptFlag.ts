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

    // Get authentication token if available
    const authToken = localStorage.getItem("token");

    // Determine correct WebSocket URL based on current environment
    let wsUrl;

    // Check if we're running locally or in production
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      // Local development - explicit port
      wsUrl = `ws://localhost:8001/ws/flag-concept`;
      console.log(
        `Development environment detected, using WebSocket URL: ${wsUrl}`
      );
    } else {
      // Production environment - use relative path
      // This assumes backend and frontend are served from same domain
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host; // Includes port if specified
      wsUrl = `${protocol}//${host}/ws/flag-concept`;
      console.log(
        `Production environment detected, using WebSocket URL: ${wsUrl}`
      );
    }

    try {
      console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      // Add connection timeout
      const connectionTimeout = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timed out");
          ws.close();
          onError?.(
            new Error(
              "WebSocket connection timed out - server may be unreachable"
            )
          );
        }
      }, 5000);

      ws.onopen = () => {
        console.log("✅ WebSocket connection established successfully");
        window.clearTimeout(connectionTimeout);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // If we have auth token, send it immediately after connection
        if (authToken) {
          try {
            ws.send(JSON.stringify({ auth_token: authToken }));
            console.log("Sent authentication token to WebSocket");
          } catch (authError) {
            console.error("Failed to send auth token:", authError);
          }
        }

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

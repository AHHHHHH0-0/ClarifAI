import { io } from "socket.io-client";
import { WS_BASE } from "../utils/api";

export const socket = io(WS_BASE, {
  transports: ["websocket"],
  autoConnect: true,
  withCredentials: true,
  extraHeaders: {
    "Access-Control-Allow-Origin": "*",
  },
});

socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});

socket.on("connect_error", (error) => {
  console.error("WebSocket connection error:", error);
});

import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_WS_URL || "ws://localhost:3001";

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});

socket.on("connect_error", (error) => {
  console.error("WebSocket connection error:", error);
});

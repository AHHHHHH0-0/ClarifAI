import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import AudioRecorder from "./components/AudioRecorder.jsx";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <div className="app-container">
      <AudioRecorder />
    </div>
  </React.StrictMode>
);

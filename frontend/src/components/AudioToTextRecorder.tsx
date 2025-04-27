import React, { useRef, useState } from 'react';

interface AudioToTextRecorderProps {
  onTranscript: (transcript: string) => void;
}

const WS_URL = 'ws://localhost:8000/ws/audio-to-text';

const AudioToTextRecorder: React.FC<AudioToTextRecorderProps> = ({ onTranscript }) => {
  const [recording, setRecording] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setRecording(true);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // send audio every 250ms

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          event.data.arrayBuffer().then((buffer) => {
            ws.send(buffer);
          });
        }
      };
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.transcript) {
          onTranscript(data.transcript);
        }
      } catch {}
    };

    ws.onclose = () => {
      setRecording(false);
      mediaRecorderRef.current?.stop();
    };
  };

  const stopRecording = () => {
    wsRef.current?.close();
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <button
      className={`px-4 py-2 rounded-md font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed`}
      onClick={recording ? stopRecording : startRecording}
      disabled={false}
    >
      {recording ? 'Stop Recording' : 'Start Recording'}
    </button>
  );
};

export default AudioToTextRecorder; 
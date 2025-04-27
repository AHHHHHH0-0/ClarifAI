import React, { useRef, useState } from 'react';

const WS_URL = 'ws://localhost:8000/ws/audio-to-text';

const AudioToTextRecorder: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    setTranscript('');
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
          setTranscript(data.transcript);
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
    <div className="flex flex-col items-center gap-4">
      <button
        className={`px-6 py-2 rounded font-semibold ${recording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>
      <div className="w-full max-w-xl bg-gray-100 rounded p-4 min-h-[60px] text-gray-800">
        <strong>Live Transcript:</strong>
        <div className="mt-2 whitespace-pre-line">{transcript || '...'}</div>
      </div>
    </div>
  );
};

export default AudioToTextRecorder; 
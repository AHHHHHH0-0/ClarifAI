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
          handleTranscriptMessage(data.transcript);
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

  const handleTranscriptMessage = (newTranscript: string) => {
    setTranscript(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + newTranscript);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 style={{ marginLeft: 16 }}>Transcript</h2>
      <div
        style={{
          flex: 1,
          padding: 24,
          overflowY: 'auto',
          background: '#f9f9f9',
          borderRadius: 12,
          margin: '16px',
          fontSize: '1.2em',
          minHeight: 200,
          maxWidth: 700,
          alignSelf: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #e0e0e0',
          width: '100%',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <b style={{ fontSize: '1.1em', marginBottom: 8 }}>Live Transcript:</b>
        <div style={{ whiteSpace: 'pre-wrap', marginTop: 8, width: '100%' }}>{transcript || <span style={{ color: '#bbb' }}>Start speaking to see the transcript...</span>}</div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <button
          className={`px-6 py-2 rounded font-semibold ${recording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
    </div>
  );
};

export default AudioToTextRecorder; 
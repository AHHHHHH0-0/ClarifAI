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
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%' }}>
      {/* Main content area (for clarify component in the future) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div className="flex flex-col items-center gap-4" style={{ marginTop: 32 }}>
          <button
            className={`px-6 py-2 rounded font-semibold ${recording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>
      </div>
      {/* Transcript panel on the right */}
      <div
        style={{
          width: 400,
          minWidth: 320,
          maxWidth: 500,
          height: '100%',
          background: '#f9f9f9',
          borderLeft: '2px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 24px',
          boxSizing: 'border-box',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <b style={{ fontSize: '1.2em', marginBottom: 16 }}>Transcript</b>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '1.1em',
            color: transcript ? '#222' : '#bbb',
            marginTop: 8,
          }}
        >
          {transcript || 'Start speaking to see the transcript...'}
        </div>
      </div>
    </div>
  );
};

export default AudioToTextRecorder; 
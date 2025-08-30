import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:8000'); // ensure CORS and URL match your backend

export default function ChatRoom({ roomId, userId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    socket.emit('joinRoom', { room: roomId });
    socket.on('newMessage', (msg) => {
      setMessages((m) => [...m, msg]);
    });
    return () => {
      socket.emit('leaveRoom', { room: roomId });
      socket.off('newMessage');
    };
  }, [roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    if (!text.trim()) return;
    socket.emit('sendMessage', { room: roomId, userId, text });
    setText('');
  };

  return (
    <div className="border rounded p-4 bg-white">
      <div className="h-60 overflow-y-scroll mb-2 p-2" style={{ border: '1px solid #eee' }}>
        {messages.map((m, i) => (
          <div key={i} className="mb-1">
            <strong>{m.userId}: </strong>
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1 w-full" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={send}>Send</button>
      </div>
    </div>
  );
}
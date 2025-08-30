import React from 'react';
import ChatRoom from '../shared/ChatRoom.jsx';

export default function ChatPage() {
  // In a real app, you’ll map user/course to rooms
  const roomId = 'global';
  const userId = 'guest';
  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-2">Course Discussion</h2>
      <ChatRoom roomId={roomId} userId={userId} />
    </div>
  );
}
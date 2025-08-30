import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CoursesPage from './pages/CoursesPage.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import ChatPage from './pages/ChatPage.jsx';
import VideoPlayer from './shared/VideoPlayer.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="p-4 bg-white shadow">
          <nav className="flex gap-4">
            <Link to="/courses" className="text-indigo-600">Courses</Link>
            <Link to="/chat" className="text-indigo-600">Chat</Link>
          </nav>
        </header>
        <main className="p-4">
          <Routes>
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/" element={<CoursesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
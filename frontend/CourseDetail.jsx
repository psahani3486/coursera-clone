import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import VideoPlayer from '../shared/VideoPlayer.jsx';
import axios from 'axios';

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await axios.get('/api/courses');
      const found = res.data.find((c) => c._id === id);
      setCourse(found);
    })();
  }, [id]);

  if (!course) return <div>Loading...</div>;

  const firstLesson = course.lessons?.[0];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
      <p className="text-gray-700 mb-4">{course.description}</p>

      {firstLesson && (
        <VideoPlayer
          src={firstLesson.hlsUrl}
          isLive={firstLesson.type === 'webrtc'} // simple flag; adapt as needed
        />
      )}

      {/* Simple quiz section could go here by loading /api/quizzes for course */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Quiz Preview</h2>
        <p className="text-sm text-gray-600">Quiz data would be loaded here from /api/quizzes?courseId={id}</p>
      </div>
    </div>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';

export default function CourseCard({ course }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="h-40 bg-gray-100 mb-2 rounded" style={{ backgroundImage: `url(${course.thumbnailUrl || ''})`, backgroundSize: 'cover' }} />
      <h3 className="font-semibold text-lg">{course.title}</h3>
      <p className="text-sm text-gray-600">{course.description}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-primary font-semibold">${course.price || 0}</span>
        <Link to={`/courses/${course._id}`} className="btn btn-primary text-sm">View</Link>
      </div>
    </div>
  );
}
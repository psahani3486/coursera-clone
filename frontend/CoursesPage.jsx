import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CourseCard from '../shared/CourseCard.jsx';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  useEffect(() => {
    (async () => {
      const res = await axios.get('/api/courses');
      setCourses(res.data);
    })();
  }, []);
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Available Courses</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {courses.map((c) => (
          <CourseCard key={c._id} course={c} />
        ))}
      </div>
    </div>
  );
}
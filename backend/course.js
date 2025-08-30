// server/models/Course.js
const { Schema, model } = require('mongoose');
const LessonSchema = new Schema({
  title: String,
  type: { type: String, enum: ['hls', 'webrtc'], default: 'hls' },
  hlsUrl: String,
  webrtcRoom: String,
  duration: Number,
});
const CourseSchema = new Schema({
  title: String,
  description: String,
  category: String,
  thumbnailKey: String,
  lessons: [LessonSchema],
  price: Number,
  createdAt: { type: Date, default: Date.now },
});
module.exports = model('Course', CourseSchema);
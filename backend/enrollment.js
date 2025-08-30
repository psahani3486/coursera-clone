// server/models/Enrollment.js
const { Schema, model } = require('mongoose');
const EnrollmentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
  progress: { type: Number, default: 0 },
  enrolledAt: { type: Date, default: Date.now },
});
module.exports = model('Enrollment', EnrollmentSchema);
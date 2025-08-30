// server/models/User.js
const { Schema, model } = require('mongoose');
const UserSchema = new Schema({
  email: { type: String, unique: true },
  name: String,
  passwordHash: String,
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  preferences: [String],
  createdAt: { type: Date, default: Date.now },
});
module.exports = model('User', UserSchema);



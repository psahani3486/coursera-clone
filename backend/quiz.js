// server/models/Quiz.js
const { Schema, model } = require('mongoose');
const QuizQuestionSchema = new Schema({
  q: String,
  options: [String],
  answerIndex: Number,
});
const QuizSchema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
  questions: [QuizQuestionSchema],
  createdAt: { type: Date, default: Date.now },
});
module.exports = model('Quiz', QuizSchema);
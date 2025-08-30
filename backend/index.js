// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const { S3 } = require('aws-sdk');
const socketio = require('socket.io');
const Redis = require('ioredis');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: '*' },
});

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const s3 = new S3({ accessKeyId: process.env.AWS_ACCESS_KEY, secretAccessKey: process.env.AWS_SECRET_KEY, region: process.env.AWS_REGION });
const redis = new Redis(process.env.REDIS_URL);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // if you store uploads locally as fallback

// --------- Models (simple definitions; place in separate files for larger apps) ---------
const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  email: { type: String, unique: true },
  name: String,
  passwordHash: String,
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  preferences: [String],
  createdAt: { type: Date, default: Date.now },
});
const User = model('User', UserSchema);

const LessonSchema = new Schema({
  title: String,
  type: { type: String, enum: ['hls', 'webrtc'], default: 'hls' },
  hlsUrl: String,
  webrtcRoom: String, // for live sessions
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
const Course = model('Course', CourseSchema);

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
const Quiz = model('Quiz', QuizSchema);

const EnrollmentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
  progress: { type: Number, default: 0 },
  enrolledAt: { type: Date, default: Date.now },
});
const Enrollment = model('Enrollment', EnrollmentSchema);

const PaymentsLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
  amount: Number,
  stripeSessionId: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
});
const PaymentsLog = model('PaymentsLog', PaymentsLogSchema);

// --------- Auth helpers ---------
const jwtSecret = process.env.JWT_SECRET || 'secret';
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// --------- Routes ---------

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ email, name, passwordHash: hash });
    const token = jwt.sign({ id: user._id, email: user.email }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    res.status(500).json({ error: 'User exists or other error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, email: user.email }, jwtSecret, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

// Get courses
app.get('/api/courses', async (req, res) => {
  const courses = await Course.find().lean();
  res.json(courses);
});

// Create course (admin)
app.post('/api/courses', authMiddleware, async (req, res) => {
  // In real app, check admin role
  const { title, description, category, price } = req.body;
  const course = await Course.create({ title, description, category, price });
  res.json(course);
});

// Enroll in course
app.post('/api/courses/:id/enroll', authMiddleware, async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.id;
  const enrollment = await Enrollment.findOneAndUpdate(
    { userId, courseId },
    { userId, courseId, enrolledAt: new Date(), progress: 0 },
    { upsert: true, new: true }
  );
  await User.findByIdAndUpdate(userId, { $addToSet: { enrolledCourses: courseId } });
  res.json(enrollment);
});

// Create Stripe Checkout session for a course
app.post('/api/payments/create-session', authMiddleware, async (req, res) => {
  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID || 'price_123', // you should create a real price in Stripe
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payments/cancel`,
    metadata: { userId: req.user.id, courseId: course._id.toString() },
  });

  await PaymentsLog.create({
    userId: req.user.id,
    courseId: course._id,
    amount: course.price,
    stripeSessionId: session.id,
    status: 'created',
  });

  res.json({ id: session.id });
});

// Stripe webhook (simplified)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  // You should verify the signature here
  const event = req.body;

  // Example: handle.checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // grant access to user for the course based on metadata
    // In real app, verify and update Enrollment or subscription
  }
  res.json({ received: true });
});

// Get recommendations for a user (basic content-based)
app.get('/api/recommendations/:userId', async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findById(userId).lean();
  // Very simple: suggest top courses from categories the user likes that they haven't enrolled
  const enrolled = new Set((user.enrolledCourses || []).map(id => id.toString()));
  const byPref = await Course.find({ category: { $in: (user.preferences || []) } })
    .sort({ createdAt: -1 })
    .lean();

  // If no preferences, return most recently created courses not enrolled
  const suggestions = byPref.filter(c => !enrolled.has(c._id.toString())).slice(0, 5);
  if (suggestions.length === 0) {
    const fallback = await Course.find({ _id: { $nin: Array.from(enrolled) } }).sort({ createdAt: -1 }).limit(5).lean();
    return res.json(fallback);
  }
  res.json(suggestions);
});

// Chat rooms are handled via Socket.IO; include a small route to fetch chat history (optional)
app.get('/api/chat/history/:courseId', authMiddleware, async (req, res) => {
  // Placeholder: you can store chat messages in Redis or DB; here we just return empty
  res.json({ messages: [] });
});

// --------- WebSocket / Socket.IO for real-time chat and live sessions ---------
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinRoom', ({ room }) => {
    socket.join(room);
    socket.to(room).emit('notice', `A user joined room ${room}`);
  });

  socket.on('sendMessage', ({ room, userId, text }) => {
    const msg = { userId, text, timestamp: new Date() };
    io.to(room).emit('newMessage', msg);
  });

  socket.on('leaveRoom', ({ room }) => {
    socket.leave(room);
  });

  // Minimal WebRTC signaling (optional)
  socket.on('signal', ({ room, data }) => {
    // forward signaling data to others in the room
    socket.to(room).emit('signal', { data, from: socket.id });
  });
});

// --------- Upload helper (S3) - example for course thumbnails or video assets ---------
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/api/upload/thumbnail', authMiddleware, upload.single('thumb'), async (req, res) => {
  const file = req.file;
  const key = `thumbnails/${Date.now()}_${uuidv4()}_${file.originalname}`;
  await s3
    .putObject({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    })
    .promise();
  res.json({ key, url: `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}` });
});

// --------- Start server ---------
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
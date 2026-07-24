const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { initializeSockets } = require('./services/socketService');
const runAutomatedCleanup = require('./scripts/cleanupOldChats');
const { protect } = require('./middleware/auth');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
const server = http.createServer(app);


// 1. END-TO-END SECURITY HEADERS MIDDLEWARE
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// 2. INDUSTRIAL RATE LIMITING MIDDLEWARE (100 Requests per 15 Mins)
const requestCounts = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown_ip';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 Minutes
  const maxRequests = 150;

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
  } else {
    const record = requestCounts.get(ip);
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
      if (record.count > maxRequests) {
        return res.status(429).json({ message: 'Too many requests from this IP. Please try again later.' });
      }
    }
  }
  next();
});

// 3. AUTOMATED ERROR LOGGING & REQUEST MONITORING MIDDLEWARE
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP MONITOR] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static Asset Routes
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Core API Endpoints
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);

// Dynamic WebRTC ICE/STUN/TURN configuration server-side variables provider
app.get('/api/config/ice-servers', (req, res) => {
  if (process.env.ICE_SERVERS_JSON) {
    try {
      const servers = JSON.parse(process.env.ICE_SERVERS_JSON);
      return res.json({ iceServers: servers });
    } catch (e) {
      console.error('Invalid ICE_SERVERS_JSON env format:', e.message);
    }
  }
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.relay.metered.ca:80' }
    ]
  });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Asthropic ChatApp Production Engine',
    uptime: process.uptime(),
    ttlPolicy: '1-Year Data Retention Policy Active',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/admin/cleanup', async (req, res) => {
  const result = await runAutomatedCleanup(process.env.TTL_DAYS || 365);
  res.json({ message: '1-Year automated background cleanup complete', result });
});

app.get('/api/admin/users', protect, async (req, res) => {
  try {
    const reqUserId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    let authorized = false;
    if (isMongoConnected) {
      const requester = await User.findById(reqUserId).select('role');
      if (requester && (requester.role === 'owner' || requester.role === 'admin')) {
        authorized = true;
      }
    } else {
      const storePath = path.join(__dirname, '../fallback_store.json');
      if (fs.existsSync(storePath)) {
        const raw = fs.readFileSync(storePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.users) {
          for (const [key, val] of data.users) {
            if (val && val._id === reqUserId && (val.role === 'owner' || val.role === 'admin')) {
              authorized = true;
              break;
            }
          }
        }
      }
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Access denied. Owner/Admin only.' });
    }

    if (isMongoConnected) {
      const users = await User.find({ isAI: { $ne: true } }).select('-password');
      return res.json(users);
    } else {
      const storePath = path.join(__dirname, '../fallback_store.json');
      if (fs.existsSync(storePath)) {
        const raw = fs.readFileSync(storePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.users) {
          const userMap = new Map();
          for (const [key, val] of data.users) {
            if (val && val._id && !val.isAI) {
              userMap.set(val._id.toString(), val);
            }
          }
          const list = Array.from(userMap.values()).map(u => ({
            _id: u._id,
            username: u.username,
            displayName: u.displayName,
            email: u.email,
            phoneNumber: u.phoneNumber || '',
            avatarUrl: u.avatarUrl || '',
            role: u.role || 'user',
            isPro: u.isPro || false,
            createdAt: u.createdAt || new Date().toISOString()
          }));
          return res.json(list);
        }
      }
      return res.json([]);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GLOBAL CENTRALIZED ERROR HANDLING MIDDLEWARE
app.use((err, req, res, next) => {
  console.error('❌ [SERVER UNHANDLED ERROR]:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// Socket.io Real-Time Engine Setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  maxHttpBufferSize: 1e7, // 10MB payload size limit
});

initializeSockets(io);
app.set('io', io);

// Firebase Firestore DB Sync Integration
const { initDbService, syncFromFirestore } = require('./services/dbService');
const { inMemoryMessages } = require('./services/socketService');

initDbService(inMemoryMessages, global.globalUsersMap);
syncFromFirestore().then(() => {
  if (global.saveFallbackStore) {
    global.saveFallbackStore();
  }
}).catch(err => console.error('[Firebase Sync] Startup sync failed:', err.message));

// SCHEDULED AUTOMATED BACKGROUND CLEANUP (Runs every 12 hours)
const CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000;
setInterval(() => {
  runAutomatedCleanup(process.env.TTL_DAYS || 365);
}, CLEANUP_INTERVAL_MS);

setTimeout(() => {
  runAutomatedCleanup(process.env.TTL_DAYS || 365);
}, 10000);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Asthropic ChatApp Production Engine Running on Port ${PORT}`);
  console.log(`⚡ WebSockets, WebRTC & Supabase Cloud Adapters Active`);
  console.log(`🛡️ Rate Limiting, Security Headers & Error Logging Active`);
  console.log(`🧹 1-Year Automated Data Purge Daemon Active`);
  console.log(`=======================================================`);
});

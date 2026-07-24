const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
const os = require('os');

const getClientIp = (req) => {
  let ip = '';
  if (req) {
    if (req.headers && req.headers['x-forwarded-for']) {
      ip = req.headers['x-forwarded-for'].split(',')[0].trim();
    }
    if (!ip && req.socket && req.socket.remoteAddress) {
      ip = req.socket.remoteAddress;
    }
    if (!ip && req.ip) {
      ip = req.ip;
    }
  }
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    return '192.168.1.15';
  }
  return ip;
};

// ============================================================
// OWNER EMAIL CONFIGURATION
// Set OWNER_EMAIL in .env to designate the master owner account.
// If not set, the first user who registers becomes the owner.
// ============================================================
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'sajalsharma46777@gmail.com').toLowerCase().trim();

// Real-Time Global User Database Store (Persisted across sessions & tabs)
const globalUsersMap = new Map();

// In-Memory OTP Store for Password Resets: key -> { otp, expiresAt }
const resetOtpsMap = new Map();

// In-Memory Logout Audit Trail Store (Max 100 logs)
const logoutAuditLogs = [
  {
    id: 'logout_demo_1',
    userId: 'user_owner_demo',
    displayName: 'Master Owner',
    email: 'sajalsharma46777@gmail.com',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    ip: '127.0.0.1 (System Test)'
  }
];

// In-Memory Login Audit Trail Store (Max 100 logs)
const loginAuditLogs = [
  {
    id: 'login_demo_1',
    userId: 'user_owner_demo',
    displayName: 'Master Owner',
    email: 'sajalsharma46777@gmail.com',
    timestamp: new Date(Date.now() - 3605000).toISOString(),
    ip: '127.0.0.1 (System Test)'
  }
];

// Pre-seed official AI assistant & default demo users
const seedDefaultUsers = () => {
  // AI Bot
  globalUsersMap.set('ai@asthropic.internal', {
    _id: 'ai_bot_user_id',
    username: 'asthropic_ai',
    displayName: 'Asthropic Gemini AI',
    email: 'ai@asthropic.internal',
    phoneNumber: '+10000000000',
    password: 'ai_bot_password',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gemini',
    isAI: true,
    role: 'user',
    isPro: false,
    statusMessage: 'Official AI Assistant'
  });

  // Aman Sharma (Default user)
  const amanUser = {
    _id: 'user_aman_seed',
    username: 'aman',
    displayName: 'Aman Sharma',
    email: 'aman@domain.com',
    phoneNumber: '+919876543210',
    password: 'password123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aman',
    role: 'user',
    isPro: false,
    statusMessage: 'Hey! I am Aman.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  };
  globalUsersMap.set('aman@domain.com', amanUser);
  globalUsersMap.set('aman', amanUser);
  globalUsersMap.set('+919876543210', amanUser);

  // Sajal Sharma (Master Owner)
  const ownerUser = {
    _id: 'user_owner_seed',
    username: 'sajal',
    displayName: 'Sajal Sharma',
    email: 'sajalsharma46777@gmail.com',
    phoneNumber: '+919999999999',
    password: 'password123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sajal',
    role: 'owner',
    isPro: true,
    statusMessage: '👑 Asthropic Owner',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  };
  globalUsersMap.set('sajalsharma46777@gmail.com', ownerUser);
  globalUsersMap.set('sajal', ownerUser);
  globalUsersMap.set('+919999999999', ownerUser);
};
seedDefaultUsers();

const seedMongoDefaultUsers = async () => {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;
    if (isMongoConnected) {
      const amanExists = await User.findOne({ email: 'aman@domain.com' });
      if (!amanExists) {
        await User.create({
          username: 'aman',
          displayName: 'Aman Sharma',
          email: 'aman@domain.com',
          phoneNumber: '+919876543210',
          password: 'password123',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aman',
          role: 'user',
          isPro: false,
          statusMessage: 'Hey! I am Aman.',
        });
        console.log('[Seed] Aman Sharma seeded to MongoDB successfully.');
      }
      const ownerExists = await User.findOne({ email: 'sajalsharma46777@gmail.com' });
      if (!ownerExists) {
        await User.create({
          username: 'sajal',
          displayName: 'Sajal Sharma',
          email: 'sajalsharma46777@gmail.com',
          phoneNumber: '+919999999999',
          password: 'password123',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sajal',
          role: 'owner',
          isPro: true,
          statusMessage: '👑 Asthropic Owner',
        });
        console.log('[Seed] Owner Sajal Sharma seeded to MongoDB successfully.');
      }
    }
  } catch (err) {
    console.error('[Seed Error] Failed to seed MongoDB:', err.message);
  }
};
mongoose.connection.on('connected', seedMongoDefaultUsers);

// Track if any real user has been registered (for auto-first-owner logic)
let firstRealUserRegistered = false;

// ── FALLBACK PERSISTENT STORAGE ──
const FALLBACK_STORE_PATH = path.join(__dirname, '../../fallback_store.json');
const callAuditLogs = [];
global.callAuditLogs = callAuditLogs;

const recordCallAudit = (callerName, recipientName, status, duration = '-') => {
  const entry = {
    id: 'call_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    callerName,
    recipientName,
    status,
    duration,
    timestamp: new Date().toISOString()
  };
  callAuditLogs.unshift(entry);
  if (callAuditLogs.length > 100) callAuditLogs.pop();
  saveFallbackStore();
  
  const { db, isFirebaseConnected } = require('../config/firebase');
  if (isFirebaseConnected && db) {
    db.collection('calls').doc(entry.id).set(entry).catch(() => {});
  }
  return entry;
};
global.recordCallAudit = recordCallAudit;

global.globalUsersMap = globalUsersMap;

const saveFallbackStore = () => {
  try {
    const data = {
      users: Array.from(globalUsersMap.entries()),
      logoutLogs: logoutAuditLogs,
      loginLogs: loginAuditLogs,
      callLogs: callAuditLogs,
      firstRealUserRegistered
    };
    fs.writeFileSync(FALLBACK_STORE_PATH, JSON.stringify(data, null, 2), 'utf8');

    // Sync users to Firebase Firestore in background
    const dbService = require('../services/dbService');
    for (const [userId, userObj] of globalUsersMap.entries()) {
      dbService.saveUser(userObj).catch(() => {});
    }
  } catch (e) {
    console.error('[Fallback Store] Save failed:', e.message);
  }
};
global.saveFallbackStore = saveFallbackStore;

const loadFallbackStore = () => {
  try {
    if (fs.existsSync(FALLBACK_STORE_PATH)) {
      const raw = fs.readFileSync(FALLBACK_STORE_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (data.users && data.users.length) {
        globalUsersMap.clear();
        seedDefaultUsers(); // ensure bot is always seeded
        for (const [key, val] of data.users) {
          globalUsersMap.set(key, val);
        }
      }
      if (data.logoutLogs && data.logoutLogs.length) {
        logoutAuditLogs.length = 0;
        logoutAuditLogs.push(...data.logoutLogs);
      }
      if (data.loginLogs && data.loginLogs.length) {
        loginAuditLogs.length = 0;
        loginAuditLogs.push(...data.loginLogs);
      }
      if (data.callLogs && data.callLogs.length) {
        callAuditLogs.length = 0;
        callAuditLogs.push(...data.callLogs);
      }
      if (data.firstRealUserRegistered !== undefined) {
        firstRealUserRegistered = data.firstRealUserRegistered;
      }
      console.log(`[Fallback Store] Loaded ${globalUsersMap.size} user map entries & ${logoutAuditLogs.length} logout logs.`);
    }
  } catch (e) {
    console.error('[Fallback Store] Load failed:', e.message);
  }
};

// Execute load immediately on startup
loadFallbackStore();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'asthropic_ultra_secure_jwt_secret_key_2026_x9000', {
    expiresIn: '30d',
  });
};

// Helper: build the safe user response payload (includes role and phone number)
const buildUserPayload = (user, token) => ({
  _id: user._id || user.id,
  username: user.username,
  displayName: user.displayName,
  email: user.email,
  phoneNumber: user.phoneNumber || '',
  avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.displayName || 'User')}`,
  statusMessage: user.statusMessage || 'Hey there! I am using Asthropic ChatApp.',
  role: user.role || 'user',
  isPro: user.isPro || false,
  proActivatedAt: user.proActivatedAt || null,
  token: token || undefined,
});

const recordLoginAudit = (userId, displayName, email, ip = '127.0.0.1') => {
  const entry = {
    id: 'login_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    userId: userId || 'unknown_id',
    displayName: displayName || 'User',
    email: email || 'No Email',
    timestamp: new Date().toISOString(),
    ip
  };
  loginAuditLogs.unshift(entry);
  if (loginAuditLogs.length > 100) loginAuditLogs.pop();
  saveFallbackStore();
  return entry;
};

// @route GET /api/auth/me (Get current logged-in user profile details)
router.get('/me', protect, async (req, res) => {
  try {
    const userId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json(buildUserPayload(user, ''));
    } else {
      let targetUser = null;
      for (const u of globalUsersMap.values()) {
        if (u._id === userId) { targetUser = u; break; }
      }
      if (!targetUser) return res.status(404).json({ message: 'User not found' });
      return res.json(buildUserPayload(targetUser, ''));
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, displayName, email, phoneNumber, password, avatarUrl } = req.body;

    if (!username || !displayName || !email || !password) {
      return res.status(400).json({ message: 'Username, Display Name, Email, and Password are required' });
    }

    const emailKey = email.toLowerCase().trim();
    const userKey = username.toLowerCase().trim();
    const phoneVal = (phoneNumber || '').trim();
    const finalAvatar = avatarUrl && avatarUrl.trim()
      ? avatarUrl.trim()
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

    // Determine role: owner email match takes precedence; else first registered user
    const determineRole = async (emailKey) => {
      if (OWNER_EMAIL && emailKey === OWNER_EMAIL) return 'owner';
      const isMongoConnected = mongoose.connection.readyState === 1;
      if (isMongoConnected) {
        const existingCount = await User.countDocuments({ isAI: { $ne: true } });
        return existingCount === 0 ? 'owner' : 'user';
      }
      // In-memory mode: first real non-AI user
      if (!firstRealUserRegistered) {
        firstRealUserRegistered = true;
        return 'owner';
      }
      return 'user';
    };

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const userExists = await User.findOne({ $or: [{ email: emailKey }, { username: userKey }] });
      if (userExists) {
        return res.status(400).json({ message: 'Account with this email or username already exists' });
      }

      const role = await determineRole(emailKey);
      const user = await User.create({
        username: userKey,
        displayName: displayName.trim(),
        email: emailKey,
        phoneNumber: phoneVal,
        password,
        avatarUrl: finalAvatar,
        role,
        isPro: role === 'owner', // Owner gets Pro for free
      });

      const payload = buildUserPayload(user, generateToken(user._id));
      const logEntry = recordLoginAudit(payload._id, payload.displayName, payload.email, getClientIp(req));
      
      const io = req.app.get('io');
      if (io) {
        io.emit('new_user_registered', payload);
        io.emit('user_logged_in', { logEntry, user: payload });
      }

      return res.status(201).json(payload);
    } else {
      if (globalUsersMap.has(emailKey)) {
        return res.status(400).json({ message: 'Account with this email already exists' });
      }

      const role = await determineRole(emailKey);
      const newUserId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const newUser = {
        _id: newUserId,
        username: userKey,
        displayName: displayName.trim(),
        email: emailKey,
        phoneNumber: phoneVal,
        password,
        avatarUrl: finalAvatar,
        statusMessage: 'Hey there! I am using Asthropic ChatApp.',
        role,
        isPro: role === 'owner',
        proActivatedAt: role === 'owner' ? new Date().toISOString() : null,
      };

      globalUsersMap.set(emailKey, newUser);
      globalUsersMap.set(userKey, newUser);
      if (phoneVal) globalUsersMap.set(phoneVal, newUser);
      if (role !== 'user') firstRealUserRegistered = true;

      saveFallbackStore(); // Save state changes
      const payload = buildUserPayload(newUser, generateToken(newUserId));
      const logEntry = recordLoginAudit(payload._id, payload.displayName, payload.email, getClientIp(req));

      const io = req.app.get('io');
      if (io) {
        io.emit('new_user_registered', payload);
        io.emit('user_logged_in', { logEntry, user: payload });
      }

      return res.status(201).json(payload);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide Email/Phone/Username and Password' });
    }

    const inputKey = email.toLowerCase().trim();
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const user = await User.findOne({
        $or: [
          { email: inputKey },
          { username: inputKey },
          { phoneNumber: inputKey }
        ],
      });

      if (user && (await user.matchPassword(password))) {
        const payload = buildUserPayload(user, generateToken(user._id));
        const logEntry = recordLoginAudit(payload._id, payload.displayName, payload.email, getClientIp(req));
        const io = req.app.get('io');
        if (io) {
          io.emit('user_logged_in', { logEntry, user: payload });
        }
        return res.json(payload);
      } else {
        return res.status(401).json({ message: 'Invalid Email/Phone/Username or Password' });
      }
    } else {
      let user = globalUsersMap.get(inputKey);
      if (!user) {
        for (const u of globalUsersMap.values()) {
          if ((u.email && u.email.toLowerCase() === inputKey) ||
              (u.username && u.username.toLowerCase() === inputKey) ||
              (u.phoneNumber && u.phoneNumber.trim() === inputKey)) {
            user = u;
            break;
          }
        }
      }

      if (user) {
        if (user.password === password) {
          const payload = buildUserPayload(user, generateToken(user._id));
          const logEntry = recordLoginAudit(payload._id, payload.displayName, payload.email, getClientIp(req));
          const io = req.app.get('io');
          if (io) {
            io.emit('user_logged_in', { logEntry, user: payload });
          }
          return res.json(payload);
        } else {
          return res.status(401).json({ message: 'Invalid Password' });
        }
      } else {
        // Auto-create user on login in dev/offline mode
        const newUserId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const namePart = inputKey.includes('@') ? inputKey.split('@')[0] : inputKey;
        const displayNameAuto = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayNameAuto)}`;
        const role = (OWNER_EMAIL && inputKey === OWNER_EMAIL)
          ? 'owner'
          : (!firstRealUserRegistered ? (() => { firstRealUserRegistered = true; return 'owner'; })() : 'user');

        const newUser = {
          _id: newUserId,
          username: namePart,
          displayName: displayNameAuto,
          email: inputKey.includes('@') ? inputKey : `${namePart}@domain.com`,
          phoneNumber: inputKey.match(/^\+?[0-9]{7,15}$/) ? inputKey : '',
          password,
          avatarUrl,
          statusMessage: 'Hey there! I am using Asthropic ChatApp.',
          role,
          isPro: role === 'owner',
          proActivatedAt: role === 'owner' ? new Date().toISOString() : null,
        };
        globalUsersMap.set(newUser.email, newUser);
        globalUsersMap.set(newUser.username, newUser);
        if (newUser.phoneNumber) globalUsersMap.set(newUser.phoneNumber, newUser);

        saveFallbackStore(); // Save state changes
        const payload = buildUserPayload(newUser, generateToken(newUserId));
        const logEntry = recordLoginAudit(payload._id, payload.displayName, payload.email, getClientIp(req));

        const io = req.app.get('io');
        if (io) {
          io.emit('new_user_registered', payload);
          io.emit('user_logged_in', { logEntry, user: payload });
        }

        return res.json(payload);
      }
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ message: 'Please enter your registered Email or Phone Number' });
    }

    const key = identifier.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    resetOtpsMap.set(key, { otp, expiresAt });

    return res.json({
      message: `Reset OTP verification code sent to ${identifier}`,
      demoOtp: otp,
      expiresInMinutes: 15
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ message: 'Identifier, OTP code, and new Password are required' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters long' });
    }

    const key = identifier.toLowerCase().trim();
    const record = resetOtpsMap.get(key);

    if (!record || record.otp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    if (Date.now() > record.expiresAt) {
      resetOtpsMap.delete(key);
      return res.status(400).json({ message: 'OTP code has expired. Please request a new one.' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const user = await User.findOne({
        $or: [{ email: key }, { username: key }, { phoneNumber: key }]
      });
      if (user) {
        user.password = newPassword;
        await user.save();
      }
    }

    // Update in-memory map
    for (const u of globalUsersMap.values()) {
      if ((u.email && u.email.toLowerCase() === key) ||
          (u.username && u.username.toLowerCase() === key) ||
          (u.phoneNumber && u.phoneNumber.trim() === key)) {
        u.password = newPassword;
      }
    }

    resetOtpsMap.delete(key);
    saveFallbackStore(); // Save state changes
    return res.json({ message: 'Password successfully reset! You can now log in with your new password.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/auth/profile (Edit Profile / Display Name)
router.put('/profile', protect, async (req, res) => {
  try {
    const { displayName, avatarUrl, phoneNumber } = req.body;
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ message: 'Display Name cannot be empty' });
    }

    const trimmedName = displayName.trim();
    const isMongoConnected = mongoose.connection.readyState === 1;
    const userId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');

    if (isMongoConnected) {
      const user = await User.findById(userId);
      if (user) {
        user.displayName = trimmedName;
        if (avatarUrl && avatarUrl.trim()) user.avatarUrl = avatarUrl.trim();
        if (phoneNumber !== undefined) user.phoneNumber = phoneNumber.trim();
        const updated = await user.save();
        return res.json(buildUserPayload(updated, generateToken(updated._id)));
      }
    }

    // In-memory Global Users Store Update & Fallback
    let targetUser = null;
    for (const u of globalUsersMap.values()) {
      if (u._id === userId) { targetUser = u; break; }
    }

    if (targetUser) {
      targetUser.displayName = trimmedName;
      if (avatarUrl && avatarUrl.trim()) targetUser.avatarUrl = avatarUrl.trim();
      if (phoneNumber !== undefined) targetUser.phoneNumber = phoneNumber.trim();
      saveFallbackStore(); // Save state changes
      return res.json(buildUserPayload(targetUser, generateToken(targetUser._id)));
    } else {
      return res.json({
        _id: userId,
        displayName: trimmedName,
        avatarUrl: avatarUrl || '',
        phoneNumber: phoneNumber || '',
        role: 'user',
        isPro: false,
        token: generateToken(userId),
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/auth/users
router.get('/users', protect, async (req, res) => {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;
    const reqUserId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');

    if (isMongoConnected) {
      const keyword = req.query.search
        ? {
            $or: [
              { displayName: { $regex: req.query.search, $options: 'i' } },
              { username: { $regex: req.query.search, $options: 'i' } },
              { email: { $regex: req.query.search, $options: 'i' } },
              { phoneNumber: { $regex: req.query.search, $options: 'i' } },
            ],
          }
        : {};
      const users = await User.find(keyword).find({ _id: { $ne: reqUserId } }).select('-password');
      return res.json(users);
    } else {
      const query = (req.query.search || '').toLowerCase().trim();
      const uniqueUsers = [];
      const seenIds = new Set();

      for (const u of globalUsersMap.values()) {
        if (!seenIds.has(u._id) && u._id !== reqUserId && !u.isAI) {
          const matchName = (u.displayName || '').toLowerCase().includes(query);
          const matchUsername = (u.username || '').toLowerCase().includes(query);
          const matchEmail = (u.email || '').toLowerCase().includes(query);
          const matchPhone = (u.phoneNumber || '').toLowerCase().includes(query);

          if (!query || matchName || matchUsername || matchEmail || matchPhone) {
            seenIds.add(u._id);
            uniqueUsers.push({
              _id: u._id,
              username: u.username,
              displayName: u.displayName,
              email: u.email,
              phoneNumber: u.phoneNumber || '',
              avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.displayName)}`,
              statusMessage: u.statusMessage,
              role: u.role || 'user',
              isPro: u.isPro || false,
            });
          }
        }
      }
      return res.json(uniqueUsers);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/auth/admin/dashboard  (Owner/Admin only)
router.get('/admin/dashboard', protect, async (req, res) => {
  try {
    const reqUserId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    let requesterRole = 'user';
    let stats = {};

    if (isMongoConnected) {
      const requester = await User.findById(reqUserId).select('role');
      if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
        return res.status(403).json({ message: 'Access denied. Owner/Admin only.' });
      }
      requesterRole = requester.role;

      const [totalUsers, proUsers, ownerCount, adminCount, recentUsers] = await Promise.all([
        User.countDocuments({ isAI: { $ne: true } }),
        User.countDocuments({ isPro: true, isAI: { $ne: true } }),
        User.countDocuments({ role: 'owner' }),
        User.countDocuments({ role: 'admin' }),
        User.find({ isAI: { $ne: true } }).sort({ createdAt: -1 }).limit(50).select('-password'),
      ]);

      stats = {
        totalUsers,
        proUsers,
        freeUsers: totalUsers - proUsers,
        ownerCount,
        adminCount,
        conversionRate: totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) + '%' : '0%',
        recentUsers: recentUsers.map(u => ({
          _id: u._id,
          displayName: u.displayName,
          email: u.email,
          phoneNumber: u.phoneNumber || '',
          role: u.role,
          isPro: u.isPro,
          createdAt: u.createdAt,
        })),
      };
    } else {
      let targetUser = null;
      for (const u of globalUsersMap.values()) {
        if (u._id === reqUserId) { targetUser = u; break; }
      }
      if (!targetUser || (targetUser.role !== 'owner' && targetUser.role !== 'admin')) {
        return res.status(403).json({ message: 'Access denied. Owner/Admin only.' });
      }
      requesterRole = targetUser.role;

      // Extract unique user objects (deduplicated by _id)
      const userMap = new Map();
      for (const u of globalUsersMap.values()) {
        if (u && u._id && !u.isAI) {
          userMap.set(u._id.toString(), u);
        }
      }
      const allUsers = Array.from(userMap.values());
      const proUsers = allUsers.filter(u => u.isPro).length;
      stats = {
        totalUsers: allUsers.length,
        proUsers,
        freeUsers: allUsers.length - proUsers,
        conversionRate: allUsers.length > 0 ? ((proUsers / allUsers.length) * 100).toFixed(1) + '%' : '0%',
        recentUsers: allUsers.map(u => ({
          _id: u._id,
          displayName: u.displayName,
          email: u.email,
          phoneNumber: u.phoneNumber || '',
          role: u.role || 'user',
          isPro: u.isPro || false,
          createdAt: u.createdAt || new Date().toISOString()
        })),
      };
    }

    return res.json({ role: requesterRole, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/auth/admin/set-role  (Owner only: promote/demote users)
router.put('/admin/set-role', protect, async (req, res) => {
  try {
    const { targetUserId, newRole } = req.body;
    if (!['admin', 'user'].includes(newRole)) {
      return res.status(400).json({ message: 'Invalid role. Allowed: admin, user' });
    }

    const reqUserId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const requester = await User.findById(reqUserId).select('role');
      if (!requester || requester.role !== 'owner') {
        return res.status(403).json({ message: 'Only the Owner can change user roles.' });
      }
      const target = await User.findById(targetUserId);
      if (!target) return res.status(404).json({ message: 'Target user not found.' });
      if (target.role === 'owner') return res.status(400).json({ message: 'Cannot change the Owner role.' });
      target.role = newRole;
      await target.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('user_state_updated', { userId: targetUserId, role: newRole });
      }

      return res.json({ message: `User ${target.displayName} role updated to ${newRole}`, user: buildUserPayload(target, '') });
    } else {
      let requester = null, target = null;
      for (const u of globalUsersMap.values()) {
        if (u._id === reqUserId) requester = u;
        if (u._id === targetUserId) target = u;
      }
      if (!requester || requester.role !== 'owner') {
        return res.status(403).json({ message: 'Only the Owner can change user roles.' });
      }
      if (!target) return res.status(404).json({ message: 'Target user not found.' });
      target.role = newRole;

      saveFallbackStore(); // Save state changes

      const io = req.app.get('io');
      if (io) {
        io.emit('user_state_updated', { userId: targetUserId, role: newRole });
      }

      return res.json({ message: `User ${target.displayName} role updated to ${newRole}` });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/auth/admin/set-pro  (Owner/Admin: grant/revoke Pro for any user)
router.put('/admin/set-pro', protect, async (req, res) => {
  try {
    const { targetUserId, isPro } = req.body;
    const reqUserId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const requester = await User.findById(reqUserId).select('role');
      if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
        return res.status(403).json({ message: 'Owner/Admin access required.' });
      }
      const target = await User.findById(targetUserId);
      if (!target) return res.status(404).json({ message: 'Target user not found.' });
      target.isPro = !!isPro;
      target.proActivatedAt = isPro ? new Date() : null;
      await target.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('user_state_updated', { userId: targetUserId, isPro: !!isPro });
      }

      return res.json({ message: `Pro plan ${isPro ? 'granted to' : 'revoked from'} ${target.displayName}` });
    } else {
      let requester = null, target = null;
      for (const u of globalUsersMap.values()) {
        if (u._id === reqUserId) requester = u;
        if (u._id === targetUserId) target = u;
      }
      if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
        return res.status(403).json({ message: 'Owner/Admin access required.' });
      }
      if (!target) return res.status(404).json({ message: 'User not found.' });
      target.isPro = !!isPro;
      target.proActivatedAt = isPro ? new Date().toISOString() : null;

      saveFallbackStore(); // Save state changes

      const io = req.app.get('io');
      if (io) {
        io.emit('user_state_updated', { userId: targetUserId, isPro: !!isPro });
      }

      return res.json({ message: `Pro ${isPro ? 'granted' : 'revoked'} for ${target.displayName}` });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const recordLogoutAudit = (userId, displayName, email, ip = '127.0.0.1') => {
  const entry = {
    id: 'logout_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    userId: userId || 'unknown_id',
    displayName: displayName || 'User',
    email: email || 'No Email',
    timestamp: new Date().toISOString(),
    ip
  };
  logoutAuditLogs.unshift(entry);
  if (logoutAuditLogs.length > 100) logoutAuditLogs.pop();
  saveFallbackStore(); // Save state changes
  return entry;
};

// @route POST /api/auth/logout (Audit log logout event)
router.post('/logout', async (req, res) => {
  try {
    const { userId, displayName, email } = req.body;
    const ip = getClientIp(req);
    const logEntry = recordLogoutAudit(userId, displayName, email, ip);

    const isMongoConnected = mongoose.connection.readyState === 1;
    if (isMongoConnected && userId) {
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('user_logged_out', { logEntry });
    }

    return res.json({ message: 'Logout activity logged successfully', logEntry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/auth/admin/logout-history (Owner/Admin only audit trail)
router.get('/admin/logout-history', protect, async (req, res) => {
  try {
    const reqUserId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    let authorized = false;
    if (isMongoConnected) {
      const requester = await User.findById(reqUserId).select('role');
      if (requester && (requester.role === 'owner' || requester.role === 'admin')) authorized = true;
    } else {
      for (const u of globalUsersMap.values()) {
        if (u._id === reqUserId && (u.role === 'owner' || u.role === 'admin')) { authorized = true; break; }
      }
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Access denied. Owner/Admin only.' });
    }

    return res.json({ logs: logoutAuditLogs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/auth/admin/login-history (Owner/Admin only audit trail)
router.get('/admin/login-history', protect, async (req, res) => {
  try {
    const reqUserId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    let authorized = false;
    if (isMongoConnected) {
      const requester = await User.findById(reqUserId).select('role');
      if (requester && (requester.role === 'owner' || requester.role === 'admin')) authorized = true;
    } else {
      for (const u of globalUsersMap.values()) {
        if (u._id === reqUserId && (u.role === 'owner' || u.role === 'admin')) { authorized = true; break; }
      }
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Access denied. Owner/Admin only.' });
    }

    return res.json({ logs: loginAuditLogs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/auth/admin/call-history (Owner/Admin only audit trail)
router.get('/admin/call-history', protect, async (req, res) => {
  try {
    const reqUserId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    let authorized = false;
    if (isMongoConnected) {
      const requester = await User.findById(reqUserId).select('role');
      if (requester && (requester.role === 'owner' || requester.role === 'admin')) authorized = true;
    } else {
      for (const u of globalUsersMap.values()) {
        if (u._id === reqUserId && (u.role === 'owner' || u.role === 'admin')) { authorized = true; break; }
      }
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Access denied. Owner/Admin only.' });
    }

    return res.json({ logs: callAuditLogs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/auth/upgrade-pro (Upgrade current user to Pro)
router.put('/upgrade-pro', protect, async (req, res) => {
  try {
    const userId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      user.isPro = true;
      user.proActivatedAt = new Date();
      await user.save();
      return res.json({ message: 'Successfully upgraded to Asthropic Pro!', user: buildUserPayload(user, '') });
    } else {
      let targetUser = null;
      for (const u of globalUsersMap.values()) {
        if (u._id === userId) { targetUser = u; break; }
      }
      if (!targetUser) return res.status(404).json({ message: 'User not found' });
      targetUser.isPro = true;
      targetUser.proActivatedAt = new Date().toISOString();

      saveFallbackStore(); // Save state changes
      return res.json({ message: 'Successfully upgraded to Asthropic Pro!', user: buildUserPayload(targetUser, '') });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route POST /api/auth/admin/reset-database
router.post('/admin/reset-database', protect, async (req, res) => {
  try {
    const reqUserId = (req.user && req.user._id) ? req.user._id.toString() : (req.user ? req.user.toString() : '');
    const isMongoConnected = mongoose.connection.readyState === 1;

    let authorized = false;
    if (isMongoConnected) {
      const requester = await User.findById(reqUserId).select('role');
      if (requester && requester.role === 'owner') authorized = true;
    } else {
      for (const u of globalUsersMap.values()) {
        if (u._id === reqUserId && u.role === 'owner') { authorized = true; break; }
      }
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Access denied. Owner only privilege.' });
    }

    console.log('🧹 [Database Reset] Initializing full platform wipe...');

    // Clear in-memory fallbacks
    const { inMemoryMessages } = require('../services/socketService');
    inMemoryMessages.length = 0;
    
    // Retain default owners in map, clear rest
    const owners = [];
    for (const u of globalUsersMap.values()) {
      if (u.role === 'owner') owners.push(u);
    }
    globalUsersMap.clear();
    owners.forEach(o => globalUsersMap.set(o._id, o));

    // Clear logs
    loginAuditLogs.length = 0;
    logoutAuditLogs.length = 0;

    // Reset MongoDB collections if active
    if (isMongoConnected) {
      await mongoose.connection.collection('messages').deleteMany({});
      await User.deleteMany({ role: { $ne: 'owner' } });
    }

    // Reset Firestore if active
    const { db, isFirebaseConnected } = require('../config/firebase');
    if (isFirebaseConnected && db) {
      const messagesSnapshot = await db.collection('messages').get();
      const batch = db.batch();
      messagesSnapshot.forEach(doc => batch.delete(doc.ref));
      
      const usersSnapshot = await db.collection('users').get();
      usersSnapshot.forEach(doc => {
        const u = doc.data();
        if (u.role !== 'owner') {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();
    }

    saveFallbackStore();

    return res.json({ success: true, message: 'Platform data wiped successfully. Default owners preserved.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

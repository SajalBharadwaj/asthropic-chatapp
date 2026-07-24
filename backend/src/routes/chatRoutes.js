const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { inMemoryMessages } = require('../services/socketService');

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// @route POST /api/chats (Create or access 1-on-1 direct chat)
router.post('/', protect, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'UserId parameter is required' });
  }

  const isMongoConnected = mongoose.connection.readyState === 1;

  if (isMongoConnected) {
    try {
      let isChat = await Chat.find({
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: req.user._id } } },
          { users: { $elemMatch: { $eq: userId } } },
        ],
      })
        .populate('users', '-password')
        .populate('latestMessage');

      isChat = await User.populate(isChat, {
        path: 'latestMessage.sender',
        select: 'displayName avatarUrl username',
      });

      if (isChat.length > 0) {
        return res.send(isChat[0]);
      } else {
        const createdChat = await Chat.create({
          chatName: 'sender',
          isGroupChat: false,
          users: [req.user._id, userId],
        });
        const FullChat = await Chat.findOne({ _id: createdChat._id }).populate('users', '-password');
        return res.status(200).json(FullChat);
      }
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else {
    // In-memory chat room creation fallback (DMs must be deterministic!)
    const sortedIds = [req.user._id, userId].sort();
    return res.status(200).json({
      _id: `dm_${sortedIds[0]}_${sortedIds[1]}`,
      chatName: 'Direct Chat',
      isGroupChat: false,
      users: [{ _id: req.user._id }, { _id: userId }],
    });
  }
});

// @route GET /api/chats (Fetch all chats)
router.get('/', protect, async (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  if (isMongoConnected) {
    try {
      const results = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
        .populate('users', '-password')
        .populate('latestMessage')
        .sort({ updatedAt: -1 });
      return res.status(200).send(results);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else {
    return res.status(200).json([]);
  }
});

// @route GET /api/chats/:chatId/messages
router.get('/:chatId/messages', protect, async (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const targetChatId = req.params.chatId === 'general_room' ? '600000000000000000000001' : req.params.chatId;

  if (isMongoConnected) {
    try {
      const messages = await Message.find({ chat: targetChatId })
        .populate('sender', 'displayName avatarUrl username isAI')
        .sort({ createdAt: 1 });
      return res.json(messages);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  } else {
    // Serve from the active in-memory buffer if MongoDB is offline
    const filtered = inMemoryMessages.filter(m => 
      m.chat === req.params.chatId || 
      m.chat === targetChatId
    );
    return res.json(filtered);
  }
});

// @route POST /api/chats/upload
router.post('/upload', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.originalname, fileType: req.file.mimetype });
});

module.exports = router;

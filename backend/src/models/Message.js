const mongoose = require('mongoose');

// AUTOMATED 60-DAY RETENTION POLICY (5,184,000 seconds = 60 Days)
const TTL_SECONDS_60_DAYS = 60 * 24 * 60 * 60; // 5184000 seconds (60 Days)

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  content: {
    type: String,
    trim: true,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'ai_response'],
    default: 'text',
  },
  mediaUrl: {
    type: String,
    default: '',
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isAIResponse: {
    type: Boolean,
    default: false,
  },
  isDelivered: {
    type: Boolean,
    default: false,
  },
  replyTo: {
    type: Object,
    default: null,
  },
  reactions: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

messageSchema.index({ chat: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

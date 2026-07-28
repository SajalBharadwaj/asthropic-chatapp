const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    default: '',
    trim: true,
  },
  avatarUrl: {
    type: String,
    default: '',
  },
  statusMessage: {
    type: String,
    default: 'Hey there! I am using Asthropic ChatApp.',
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  isAI: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'user'],
    default: 'user',
  },
  isPro: {
    type: Boolean,
    default: false,
  },
  proActivatedAt: {
    type: Date,
    default: null,
  },
  totalMessages: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'asthropic_ultra_secure_jwt_secret_key_2026_x9000');
      
      const isMongoConnected = mongoose.connection.readyState === 1;
      if (isMongoConnected) {
        const mongoUser = await User.findById(decoded.id).select('-password');
        if (mongoUser) {
          req.user = mongoUser;
          return next();
        }
      }
      
      // Fallback for in-memory global users mode or when decoded token contains user ID
      req.user = { _id: decoded.id };
      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };

const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const dbService = require('../services/dbService');

let razorpayInstance = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('💳 [Razorpay] SDK Initialized successfully.');
  } else {
    console.warn('⚠️ [Razorpay] Keys missing in .env. Operating in TEST simulation mode.');
  }
} catch (err) {
  console.error('❌ [Razorpay] Init failed:', err.message);
}

// @route POST /api/payments/create-order
router.post('/create-order', protect, async (req, res) => {
  try {
    const amount = 19900; // Rs. 199 in paise (199 * 100)
    
    if (razorpayInstance) {
      const options = {
        amount,
        currency: 'INR',
        receipt: 'receipt_order_' + Date.now(),
      };
      const order = await razorpayInstance.orders.create(options);
      return res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      });
    } else {
      // Return simulated order ID
      return res.json({
        success: true,
        orderId: 'order_simulated_' + Date.now(),
        amount,
        currency: 'INR',
        key: 'rzp_test_simulated_key'
      });
    }
  } catch (err) {
    console.error('[Razorpay Create Order Error]:', err.message);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// @route POST /api/payments/verify-payment
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const reqUserId = req.user._id ? req.user._id.toString() : req.user.toString();

    let verified = false;

    if (razorpayInstance && !razorpay_order_id.startsWith('order_simulated_')) {
      const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const digest = shasum.digest('hex');
      if (digest === razorpay_signature) {
        verified = true;
      }
    } else {
      // Auto-verify simulated checkout for sandbox test flows
      verified = true;
    }

    if (verified) {
      const isMongoConnected = mongoose.connection.readyState === 1;
      let updatedUser = null;

      if (isMongoConnected) {
        updatedUser = await User.findByIdAndUpdate(
          reqUserId,
          { isPro: true, role: 'pro_user' },
          { new: true }
        ).select('-password');
      }

      // Sync fallback state
      if (global.globalUsersMap && global.globalUsersMap.has(reqUserId)) {
        const cachedUser = global.globalUsersMap.get(reqUserId);
        cachedUser.isPro = true;
        cachedUser.role = 'pro_user';
        global.globalUsersMap.set(reqUserId, cachedUser);
        
        if (global.saveFallbackStore) {
          global.saveFallbackStore();
        }
        updatedUser = cachedUser;
      }

      // Notify user via Socket if connected
      const io = req.app.get('io');
      if (io) {
        io.emit('user_role_updated', {
          userId: reqUserId,
          isPro: true,
          role: 'pro_user'
        });
      }

      return res.json({
        success: true,
        message: 'Payment verified and Pro status granted!',
        user: updatedUser
      });
    } else {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (err) {
    console.error('[Razorpay Verify Payment Error]:', err.message);
    res.status(500).json({ message: 'Internal server verification error' });
  }
});

module.exports = router;

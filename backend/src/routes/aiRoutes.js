const express = require('express');
const geminiService = require('../services/geminiService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route POST /api/ai/query
router.post('/query', protect, async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const reply = await geminiService.generateResponse(prompt, history || []);
    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

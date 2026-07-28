const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } catch (e) {
    console.log('[Gemini AI] Initialization warning:', e.message);
  }
}

const geminiService = {
  async generateResponse(userPrompt, conversationHistory = []) {
    try {
      if (!genAI && process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }

      if (genAI) {
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.6-flash',
          systemInstruction: 'You are Asthropic AI, a helpful, ultra-fast intelligent assistant built inside Asthropic ChatApp. Provide concise, friendly, and accurate answers.',
        });

        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        return response.text() || 'I am currently processing your request.';
      }

      // Smart Intelligent Engine Fallback (when GEMINI_API_KEY is not set)
      const text = userPrompt.toLowerCase().trim();

      if (text.includes('hi') || text.includes('hello') || text.includes('hey') || text.includes('hii')) {
        return "Hello! 👋 I am Asthropic AI. How can I assist you with your chats, questions, or coding today?";
      }

      if (text.includes('who are you') || text.includes('what are you')) {
        return "I am Asthropic AI, a real-time intelligent assistant built right into Asthropic ChatApp! I can answer questions, summarize messages, write code, and chat with you 24/7.";
      }

      if (text.includes('code') || text.includes('javascript') || text.includes('flutter') || text.includes('python')) {
        return "```javascript\n// Asthropic High-Performance Engine\nconsole.log('Real-Time WebSockets & AI Ready! 🚀');\n```\nNeed help writing code for a specific feature?";
      }

      if (text.includes('time') || text.includes('date')) {
        return `The current local time is ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}.`;
      }

      return `Asthropic AI Response: I understood your query regarding "${userPrompt}". To enable full unlimited LLM reasoning via Google Gemini, add your \`GEMINI_API_KEY\` to the backend \`.env\` file! 🚀`;

    } catch (err) {
      console.error('[Gemini AI Error]:', err.message);
      return `[Asthropic AI]: I encountered a brief issue. Please try again shortly. (${err.message})`;
    }
  }
};

module.exports = geminiService;

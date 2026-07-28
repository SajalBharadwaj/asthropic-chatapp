# Asthropic ChatApp Backend Service

High-performance WebSocket & REST server engine for Asthropic ChatApp.

## Stack
- Node.js & Express
- Socket.io (Real-time events)
- MongoDB Mongoose (with 7-Day TTL Index for message auto-deletion)
- Redis Cache & Presence Engine (with O(1) in-memory fallback)
- Gemini AI API integration (`gemini-2.5-flash`)

## Features & Endpoints
1. **Auth Routes**: `/api/auth/login`, `/api/auth/signup`, `/api/auth/users`
2. **Chat Routes**: `/api/chats`, `/api/chats/group`, `/api/chats/:chatId/messages`, `/api/chats/upload`
3. **AI Routes**: `/api/ai/query`
4. **WebSocket Events**:
   - `setup` (User register socket)
   - `send_message` (Broadcast & auto-trigger `@gemini` replies)
   - `typing` / `stop_typing`
   - `user_presence` (Real-time online/offline updates)

## Installation & Launch
```bash
npm install
npm run dev
```

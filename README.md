<<<<<<< HEAD
# Asthropic ChatApp System Architecture

Asthropic ChatApp is an enterprise-grade real-time Android chat application designed to support 1000+ concurrent users with zero latency, minimal CPU/memory footprint, and a zero-cost infrastructure model.

```
asthropic_chatapp/
├── backend/             # Node.js + Express + Socket.io + MongoDB + Redis + Gemini AI
└── frontend/            # Flutter Android Core Codebase with Local Caching & WhatsApp UI
```

## System Highlights & Performance Strategy
1. **7-Day Automatic Message Auto-Delete**: Configured via MongoDB TTL index (`expireAfterSeconds: 604800`) on `createdAt`.
2. **Instant Local Cache Engine**: Caches user sessions, chat lists, and message history locally on device to guarantee zero load-time lag on cold startup.
3. **Presence System**: Redis O(1) state engine tracking online/offline status and live last-seen timestamps.
4. **Native Gemini AI Integration**: Direct Gemini AI assistant tab and in-chat `@gemini` trigger.
=======
# asthropic-chatapp
A modern real-time chat web app with live status and instant messaging.
>>>>>>> be9f3e564a2f61cd9bd0333535e855e41730e802

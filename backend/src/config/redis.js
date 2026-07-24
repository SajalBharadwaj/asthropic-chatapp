const Redis = require('ioredis');

let redisClient = null;
const inMemoryStore = new Map();

try {
  const redisUrl = process.env.REDIS_URI || 'redis://localhost:6379';
  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Don't hang if Redis is unavailable
  });

  redisClient.on('connect', () => console.log('[Cache Engine] Redis connected successfully.'));
  redisClient.on('error', () => {
    // Fall back silently to high-speed in-memory store
  });
  
  redisClient.connect().catch(() => {
    console.log('[Cache Engine] Redis unavailable. Falling back to high-performance in-memory Map engine.');
    redisClient = null;
  });
} catch (err) {
  redisClient = null;
}

const cache = {
  async set(key, val, ttlSeconds = null) {
    if (redisClient && redisClient.status === 'ready') {
      if (ttlSeconds) {
        await redisClient.set(key, JSON.stringify(val), 'EX', ttlSeconds);
      } else {
        await redisClient.set(key, JSON.stringify(val));
      }
    } else {
      inMemoryStore.set(key, { val, expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null });
    }
  },

  async get(key) {
    if (redisClient && redisClient.status === 'ready') {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const entry = inMemoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        inMemoryStore.delete(key);
        return null;
      }
      return entry.val;
    }
  },

  async del(key) {
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.del(key);
    } else {
      inMemoryStore.delete(key);
    }
  }
};

module.exports = cache;

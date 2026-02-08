import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../lib/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    logger.warn(`Redis retry attempt ${times}, next in ${delay}ms`);
    return delay;
  },
  lazyConnect: true,
});

redis.on('error', (err) => logger.error('Redis connection error:', err.message));
redis.on('connect', () => logger.info('Redis connected'));
redis.on('reconnecting', () => logger.info('Redis reconnecting...'));

export async function connectRedis() {
  try {
    await redis.connect();
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
    logger.error('Redis is required for auth tokens and presence. The app will not function correctly without it.');
    throw err;
  }
}

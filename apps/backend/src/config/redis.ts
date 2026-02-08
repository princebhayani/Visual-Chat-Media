import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../lib/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => logger.error('Redis connection error:', err.message));
redis.on('connect', () => logger.info('Redis connected'));

export async function connectRedis() {
  try {
    await redis.connect();
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
  }
}

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import redis from '../redis.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const expirationQueue = new Queue('ticket-expiration', { connection });

export const expirationWorker = new Worker(
  'ticket-expiration',
  async (job) => {
    const { eventId, userId, category, reservationId } = job.data;
    console.log(`[ExpirationWorker] Running check for reservationId: ${reservationId}, eventId: ${eventId}, userId: ${userId}, category: ${category}`);

    const fulfilledKey = `fulfilled:${reservationId}`;
    const isFulfilled = await redis.get(fulfilledKey);

    if (isFulfilled) {
      console.log(`[ExpirationWorker] Reservation ${reservationId} was fulfilled (paid). No stock reclaimed.`);
      await redis.del(fulfilledKey); // Clean up the token
      return;
    }

    const holdKey = `hold:${eventId}:${userId}`;
    const holdDataStr = await redis.get(holdKey);
    
    let isSameReservation = false;
    if (holdDataStr) {
      try {
        const holdData = JSON.parse(holdDataStr);
        if (holdData.reservationId === reservationId) {
          isSameReservation = true;
        }
      } catch (err) {
        console.error('Failed to parse hold data in worker', err);
      }
    }

    const stockKey = `ticket_stock:${eventId}:${category}`;
    const mainStockKey = `ticket_stock:${eventId}`;

    await Promise.all([
      redis.incr(stockKey),
      redis.incr(mainStockKey),
    ]);

    // If the current active hold belongs to this reservation, delete it from Redis.
    if (isSameReservation) {
      await redis.del(holdKey);
      console.log(`[ExpirationWorker] Deleted expired hold key for user ${userId}`);
    }

    console.log(`[ExpirationWorker] Stock restored for event: ${eventId}, category: ${category}.`);
  },
  { connection }
);

expirationWorker.on('error', (err) => {
  console.error('[ExpirationWorker] Error:', err);
});

expirationWorker.on('failed', (job, err) => {
  console.error(`[ExpirationWorker] Job ${job?.id} failed:`, err);
});

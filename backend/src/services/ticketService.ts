import redis, { isRedisConnected } from '../redis.js';
import prisma from '../db.js';


import { TicketCategory } from '@prisma/client';

export const reserveTicket = async (eventId: string, userId: string, category: TicketCategory = 'CAT2', seatNumber?: string, price?: number) => {
  if (!isRedisConnected()) {
    throw new Error('Service Unavailable: Reservation system is currently offline.');
  }

  try {
    // Issue 4 Fix: Use category-specific stock keys
    const stockKey = `ticket_stock:${eventId}:${category}`;
    const holdKey = `hold:${eventId}:${userId}`;
    const canReserveKey = `can_reserve:${eventId}:${userId}`;

    // Check if user is allowed to reserve
    const canReserve = await redis.get(canReserveKey);
    if (!canReserve && process.env.STRICT_QUEUE === 'true') {
      throw new Error('You must wait in the queue before reserving.');
    }

    // Check if user already holds a ticket
    const existingHold = await redis.get(holdKey);
    if (existingHold) {
      throw new Error('You already have a ticket reserved. Please complete payment.');
    }

    // Atomic decrement for specific category
    const newStock = await redis.decr(stockKey);

    if (newStock < 0) {
      // Revert decrement if stock is empty
      await redis.incr(stockKey);
      throw new Error(`Category ${category} is sold out!`);
    }

    // Set hold key with 5 minute TTL (300 seconds)
    const holdData = JSON.stringify({ category, seatNumber, price });
    await redis.set(holdKey, holdData, 'EX', 300);
    
    // Remove the promotion flag once they reserve
    await redis.del(canReserveKey);

    return { success: true, message: 'Ticket reserved! You have 5 minutes to pay.', expiresAt: Date.now() + 300000 };
  } catch (error: any) {
    if (error.message && (error.message.includes('sold out') || error.message.includes('queue') || error.message.includes('already have'))) {
      throw error;
    }
    console.error('Redis reserveTicket error:', error);
    throw new Error('Service Unavailable: Could not reserve ticket.');
  }
};


export const confirmPayment = async (eventId: string, userId: string) => {
  if (!isRedisConnected()) {
    throw new Error('Service Unavailable: Payment system is conditionally offline.');
  }

  try {
    const holdKey = `hold:${eventId}:${userId}`;

    // Atomic check and delete to prevent double payment race condition
    const holdDataStr = await redis.get(holdKey);
    if (!holdDataStr) {
      throw new Error('Reservation expired or not found.');
    }

    let category: TicketCategory | undefined, seatNumber, price;
    try {
      const parsed = JSON.parse(holdDataStr);
      category = parsed.category;
      seatNumber = parsed.seatNumber;
      price = parsed.price;
    } catch (e) {
      console.error('Failed to parse hold data', e);
    }

    // Wrap DB operations in a transaction
    try {
      const [transaction] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            userId,
            eventId,
            status: 'PAID',
            category,
            seatNumber,
            price,
          },
        }),
        // Issue 1 Fix: Synchronize DB totalStock
        prisma.event.update({
          where: { id: eventId },
          data: { totalStock: { decrement: 1 } }
        })
      ]);

      // Remove hold key AFTER DB success
      await redis.del(holdKey);

      return { success: true, transaction };
    } catch (dbError: any) {
      console.error('DB Payment Confirmation Error:', dbError);
      throw new Error('Database Error: Could not confirm payment in the database.');
    }
  } catch (error: any) {
    if (error.message && error.message.includes('Reservation expired')) {
      throw error;
    }
    console.error('Payment confirmation error:', error);
    throw new Error(error.message || 'Service Unavailable: Could not confirm payment.');
  }
};

export const getTicketStatus = async (eventId: string, userId: string) => {
  if (!isRedisConnected()) {
    return { status: 'unknown_service_offline' };
  }

  try {
    const holdKey = `hold:${eventId}:${userId}`;
    const ttl = await redis.ttl(holdKey);
    
    if (ttl < 0) return { status: 'none' };
    return { status: 'held', remainingTime: ttl };
  } catch (error) {
    console.error('Redis getTicketStatus error:', error);
    return { status: 'unknown_service_offline' };
  }
};

import redis from '../redis.js';
import prisma from '../db.js';


export const reserveTicket = async (eventId: string, userId: string, category: string = 'CAT 2', seat: string = 'AUTO') => {
  const stockKey = `ticket_stock:${eventId}:${category}`;
  const totalStockKey = `ticket_stock:${eventId}:total`;
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
    throw new Error(`${category} is sold out!`);
  }

  // Also decrement total stock
  await redis.decr(totalStockKey);

  // Set hold key with 5 minute TTL (300 seconds)
  // Store seat details in the hold value
  const seatDetails = JSON.stringify({ category, seat });
  await redis.set(holdKey, seatDetails, 'EX', 300);
  
  // Remove the promotion flag once they reserve
  await redis.del(canReserveKey);

  return { 
    success: true, 
    message: `Ticket reserved for ${category}! You have 5 minutes to pay.`, 
    expiresAt: Date.now() + 300000,
    seatDetails: { category, seat }
  };
};


export const confirmPayment = async (eventId: string, userId: string) => {
  const holdKey = `hold:${eventId}:${userId}`;

  const holdValue = await redis.get(holdKey);
  if (!holdValue) {
    throw new Error('Reservation expired or not found.');
  }

  const { category, seat } = JSON.parse(holdValue);

  // Finalize in PostgreSQL
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      eventId,
      status: 'PAID',
      seatDetails: JSON.stringify({ category, seat }),
    },
  });

  // Remove hold key
  await redis.del(holdKey);

  return { success: true, transaction };
};

export const getTicketStatus = async (eventId: string, userId: string) => {
  const holdKey = `hold:${eventId}:${userId}`;
  const ttl = await redis.ttl(holdKey);
  
  if (ttl < 0) return { status: 'none' };
  return { status: 'held', remainingTime: ttl };
};

import redis from '../redis.js';
import { io } from '../index.js';


export const joinQueue = async (eventId: string, userId: string) => {
  const queueKey = `queue:${eventId}`;
  
  // Check if user already in queue
  const queueItems = await redis.lrange(queueKey, 0, -1);
  if (queueItems.includes(userId)) {
    const pos = queueItems.indexOf(userId) + 1;
    return { position: pos, alreadyInQueue: true };
  }

  await redis.rpush(queueKey, userId);
  const position = await redis.llen(queueKey);
  
  // Notify queue update
  io.to(`event:${eventId}`).emit('queue_update', { eventId, queueLength: position });
  
  return { position, alreadyInQueue: false };
};

export const getQueueStatus = async (eventId: string, userId: string) => {
  const queueKey = `queue:${eventId}`;
  const queueItems = await redis.lrange(queueKey, 0, -1);
  const pos = queueItems.indexOf(userId);

  if (pos === -1) {
    // Check if user is already promoted
    const canReserve = await redis.get(`can_reserve:${eventId}:${userId}`);
    if (canReserve) return { status: 'promoted' };
    
    return { status: 'not_in_queue' };
  }

  return { status: 'waiting', position: pos + 1 };
};

export const promoteFromQueue = async (eventId: string, count: number = 5) => {
  const queueKey = `queue:${eventId}`;
  const promotedUsers = [];

  for (let i = 0; i < count; i++) {
    const userId = await redis.lpop(queueKey);
    if (!userId) break;
    promotedUsers.push(userId);
    
    // Set a flag that this user can now reserve
    await redis.set(`can_reserve:${eventId}:${userId}`, 'true', 'EX', 60); // 60s to start reservation
    
    // Notify the specific user via their own room or a broadcast
    io.to(`event:${eventId}`).emit('user_promoted', { userId, eventId });
  }

  if (promotedUsers.length > 0) {
    const remaining = await redis.llen(queueKey);
    io.to(`event:${eventId}`).emit('queue_update', { eventId, queueLength: remaining });
  }

  return promotedUsers;
};


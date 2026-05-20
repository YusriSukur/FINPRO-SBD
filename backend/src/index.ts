import './env.js';
import express from 'express';
import http from 'http';

import { Server } from 'socket.io';

import cors from 'cors';
import * as queueService from './services/queueService.js';

import apiRoutes from './routes/api.js';
import prisma from './db.js';
import redis, { isRedisConnected } from './redis.js';
import './services/expirationQueue.js';


const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Health Endpoint
app.get('/health', async (req, res) => {
  try {
    // Quickly test purely DB connection
    await prisma.$queryRaw`SELECT 1`;
    const redisOk = isRedisConnected();
    
    res.json({
      status: 'ok',
      db: 'connected',
      redis: redisOk ? 'connected' : 'offline',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'TicketFlash Backend API' });
});

// Real-time connections
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('join_event', (eventId) => {
    socket.join(`event:${eventId}`);
    console.log(`📡 User joined room: event:${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected');
  });
});

// import prisma from './db.js'; // Moved to top

// Bootstrap existing events into Redis on startup (Issue 5: Cold Start Fix)
const bootstrapActiveEvents = async () => {
  try {
    const events = await prisma.event.findMany();
    if (events.length > 0) {
      const eventIds = events.map(e => e.id);

      // Mark events as active in Redis
      await redis.sadd('active_events', ...eventIds);

      for (const event of events) {
        const mainStockKey = `ticket_stock:${event.id}`;
        const mainExists = await redis.exists(mainStockKey);
        const categoryKeys = [
          `ticket_stock:${event.id}:VIP`,
          `ticket_stock:${event.id}:CAT1`,
          `ticket_stock:${event.id}:CAT2`,
        ];
        const categoryValues = await redis.mget(...categoryKeys);
        const hasMissingCategories = categoryValues.some((value) => value === null);

        if (!mainExists || hasMissingCategories) {
          console.log(`♻️ Backfilling stock keys for event: ${event.title}`);
          // Calculate remaining stock from DB (totalStock is already decremented on paid transactions)
          // But to be even safer, we can re-calculate based on successful transactions if needed.
          // For now, we trust the Event.totalStock as the source of truth.
          const total = event.totalStock;
          const vips = Math.floor(total * 0.1);
          const cat1s = Math.floor(total * 0.3);
          const cat2s = total - vips - cat1s;

          const updates: Promise<unknown>[] = [
            redis.set(`ticket_stock:${event.id}:VIP`, vips),
            redis.set(`ticket_stock:${event.id}:CAT1`, cat1s),
            redis.set(`ticket_stock:${event.id}:CAT2`, cat2s),
          ];

          if (!mainExists) {
            updates.push(redis.set(mainStockKey, total));
          }

          await Promise.all(updates);
        }
      }
      console.log(`✅ Bootstrapped ${events.length} active events into Redis`);
    }
  } catch (error) {
    console.error('Failed to bootstrap active events:', error);
  }
};
let queueWorkerStarted = false;
const startQueueWorker = () => {
  if (queueWorkerStarted) return;
  queueWorkerStarted = true;

  // Background Worker: Promote users from queue every 5 seconds (Issue 3: Efficient Worker)
  setInterval(async () => {
    try {
      if (!isRedisConnected()) {
        console.log('⚠️ Redis offline, skipping background queue promotion.');
        return;
      }

      // Use Redis Set to avoid DB polling every 5 seconds
      const activeEventIds = await redis.smembers('active_events');
      for (const eventId of activeEventIds) {
        // Promote users ONLY if there is stock (logic inside promoteFromQueue)
        const promoted = await queueService.promoteFromQueue(eventId, 3);
        if (promoted && promoted.length > 0) {
          console.log(`🚀 Promoted ${promoted.length} users for event: ${eventId}`);
        }
      }
    } catch (error) {
      console.error('Worker error:', error);
    }
  }, 5000);
};

const initRedisBootstrapping = async () => {
  if (!isRedisConnected()) return;
  await bootstrapActiveEvents();
  startQueueWorker();
};

redis.on('ready', () => {
  void initRedisBootstrapping();
});

void initRedisBootstrapping();


server.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});

 

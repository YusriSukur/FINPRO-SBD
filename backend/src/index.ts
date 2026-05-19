import './env.js';
import express from 'express';
import http from 'http';

import { Server } from 'socket.io';

import cors from 'cors';
import * as queueService from './services/queueService.js';

import apiRoutes from './routes/api.js';
import prisma from './db.js';
import { isRedisConnected } from './redis.js';


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

// Background Worker: Promote users from queue every 5 seconds
setInterval(async () => {
  try {
    if (!isRedisConnected()) {
      console.log('⚠️ Redis offline, skipping background queue promotion.');
      return;
    }

    const events = await prisma.event.findMany();
    for (const event of events) {
      // For this demo, let's promote 3 users every 5 seconds if there's stock
      // In a real app, this would be more sophisticated
      const promoted = await queueService.promoteFromQueue(event.id, 3);
      if (promoted && promoted.length > 0) {
        console.log(`🚀 Promoted ${promoted.length} users for event: ${event.title}`);
      }
    }
  } catch (error) {
    console.error('Worker error:', error);
  }
}, 5000);


server.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});

 

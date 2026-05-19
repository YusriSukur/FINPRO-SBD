import type { Request, Response } from 'express';
import prisma from '../db.js';
import redis from '../redis';

export const getEvents = async (req: Request, res: Response) => {
  try {
    // Try cache first, gracefully fallback on Redis error
    try {
      const cached = await redis.get('events:list');
      if (cached) {
        const events = JSON.parse(cached);
        if (events.length === 0) return res.json([]);
        
        const stockKeys = events.map((e: any) => `ticket_stock:${e.id}`);
        const stocks = await redis.mget(...stockKeys);
        const enrichedEvents = events.map((event: any, i: number) => ({
          ...event,
          currentStock: stocks[i] ? parseInt(stocks[i]) : 0,
        }));
        console.log('✅ Cache Hit: Served events from Redis');
        return res.json(enrichedEvents);
      }
    } catch (redisError: any) {
      console.log('⚠️ Redis unreachable (read error). Bypassing cache! Reason:', redisError.message);
    }

    // Cache miss or Redis error - query PostgreSQL
    const events = await prisma.event.findMany();
    
    try {
      await redis.set('events:list', JSON.stringify(events), 'EX', 60);
    } catch (redisError: any) {
      console.log('⚠️ Redis unreachable (write error). Skipping cache save.');
    }

    if (events.length === 0) return res.json([]);

    let stocks: (string | null)[] = [];
    try {
      const stockKeys = events.map((e) => `ticket_stock:${e.id}`);
      stocks = await redis.mget(...stockKeys);
    } catch (redisError: any) {
      console.log('⚠️ Redis unreachable (stock read error). Defaulting stocks to 0.');
      stocks = new Array(events.length).fill(null);
    }

    const enrichedEvents = events.map((event, i) => ({
      ...event,
      currentStock: stocks[i] ? parseInt(stocks[i]) : 0,
    }));
    console.log('❌ Cache Miss: Fetched events from PostgreSQL and updated Redis');
    res.json(enrichedEvents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    let stock = null;
    try {
      stock = await redis.get(`ticket_stock:${id}`);
    } catch (redisError) {
      console.error('Redis stock read error:', redisError);
    }

    res.json({
      ...event,
      currentStock: stock ? parseInt(stock) : 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, price, priceVIP, priceCAT1, priceCAT2, imageUrl, totalStock, date } = req.body;
    
    const parsedPriceVIP = priceVIP ? parseFloat(priceVIP) : 2500000;
    const parsedPriceCAT1 = priceCAT1 ? parseFloat(priceCAT1) : 1500000;
    const parsedPriceCAT2 = priceCAT2 ? parseFloat(priceCAT2) : 800000;
    const basePrice = price ? parseFloat(price) : parsedPriceCAT2;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        price: basePrice,
        priceVIP: parsedPriceVIP,
        priceCAT1: parsedPriceCAT1,
        priceCAT2: parsedPriceCAT2,
        imageUrl,
        totalStock: parseInt(totalStock),
        date: new Date(date),
      },
    });

    // Initialize stock in Redis
    await redis.set(`ticket_stock:${event.id}`, totalStock);
    
    // Add to active events set for background worker
    await redis.sadd('active_events', event.id);
    
    // Invalidate events cache
    await redis.del('events:list');
    
    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

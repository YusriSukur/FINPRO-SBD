import type { Request, Response } from 'express';
import prisma from '../db.js';
import redis from '../redis';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany();
    // Enrich with real-time stock from Redis
    const enrichedEvents = await Promise.all(events.map(async (event) => {
      const stock = await redis.get(`ticket_stock:${event.id}`);
      return {
        ...event,
        currentStock: stock ? parseInt(stock) : 0,
      };
    }));
    res.json(enrichedEvents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const stock = await redis.get(`ticket_stock:${id}`);
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
    
    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

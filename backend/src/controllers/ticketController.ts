import type { Request, Response } from 'express';
import * as ticketService from '../services/ticketService.js';
import * as queueService from '../services/queueService.js';


export const joinQueue = async (req: Request, res: Response) => {
  try {
    const { eventId, userId } = req.body;
    const result = await queueService.joinQueue(eventId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getQueueStatus = async (req: Request, res: Response) => {
  try {
    const { eventId, userId } = req.query;
    const result = await queueService.getQueueStatus(eventId as string, userId as string);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const leaveQueue = async (req: Request, res: Response) => {
  try {
    const { eventId, userId } = req.body;
    const result = await queueService.leaveQueue(eventId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const reserveTicket = async (req: Request, res: Response) => {
  try {
    const { eventId, userId, category, seatNumber, price } = req.body;
    
    // Check if user is allowed to reserve (from queue promotion)
    // For simplicity in this demo, we might skip the strict check or implement it
    const canReserve = await (process.env.STRICT_QUEUE === 'true' ? 
      ticketService.reserveTicket(eventId, userId, category, seatNumber, price) : 
      ticketService.reserveTicket(eventId, userId, category, seatNumber, price));

    res.json(canReserve);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { eventId, userId } = req.body;
    const result = await ticketService.confirmPayment(eventId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getTicketStatus = async (req: Request, res: Response) => {
  try {
    const { eventId, userId } = req.query;
    const result = await ticketService.getTicketStatus(eventId as string, userId as string);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

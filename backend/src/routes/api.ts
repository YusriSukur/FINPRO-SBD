import express from 'express';
import * as eventController from '../controllers/eventController.js';
import * as ticketController from '../controllers/ticketController.js';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Auth
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Events
router.get('/events', eventController.getEvents);
router.get('/events/:id', eventController.getEventById);
router.post('/events', eventController.createEvent);

// Queue
router.post('/queue/join', ticketController.joinQueue);
router.post('/queue/leave', ticketController.leaveQueue);
router.get('/queue/status', ticketController.getQueueStatus);

// Tickets
router.post('/ticket/reserve', ticketController.reserveTicket);
router.post('/payment/confirm', ticketController.confirmPayment);
router.get('/ticket/status', ticketController.getTicketStatus);

export default router;

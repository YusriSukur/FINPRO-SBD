import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
});

export const getEvents = async () => {
  const response = await api.get('/events');
  return response.data;
};

export const getEventById = async (id: string) => {
  const response = await api.get(`/events/${id}`);
  return response.data;
};

export const joinQueue = async (eventId: string, userId: string) => {
  const response = await api.post('/queue/join', { eventId, userId });
  return response.data;
};

export const leaveQueue = async (eventId: string, userId: string) => {
  const response = await api.post('/queue/leave', { eventId, userId });
  return response.data;
};

export const getQueueStatus = async (eventId: string, userId: string) => {
  const response = await api.get('/queue/status', {
    params: { eventId, userId },
  });
  return response.data;
};

export const reserveTicket = async (eventId: string, userId: string, category?: string, seatNumber?: string, price?: number) => {
  const response = await api.post('/ticket/reserve', { eventId, userId, category, seatNumber, price });
  return response.data;
};

export const confirmPayment = async (eventId: string, userId: string) => {
  const response = await api.post('/payment/confirm', { eventId, userId });
  return response.data;
};

export const getTicketStatus = async (eventId: string, userId: string) => {
  const response = await api.get('/ticket/status', {
    params: { eventId, userId },
  });
  return response.data;
};

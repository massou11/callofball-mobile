import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const serviceService = {
  getAll: () => api.get('/services'),
  getVenues: () => api.get('/services/venues'),
};

export const pickupService = {
  getAvailability: (date) => api.get('/reservations/pickup/availability', { params: { date } }),
};

export const slotService = {
  getByVenue: (date) => api.get('/slots/by-venue', { params: { date } }),
  getSlots: (venueId, date) => api.get('/slots', { params: { venueId, date } }),
};

export const reservationService = {
  getSlots: (venueId, date) => api.get('/reservations/slots', { params: { venueId, date } }),
  create: (data) => api.post('/reservations', data),
  getMine: () => api.get('/reservations/mine'),
  cancel: (id) => api.patch(`/reservations/${id}/cancel`),
  getAll: (params) => api.get('/reservations/admin/all', { params }),
  confirm: (id) => api.patch(`/reservations/admin/${id}/confirm`),
  getStats: () => api.get('/reservations/admin/stats'),
};

export const adminService = {
  getClients: () => api.get('/admin/clients'),
  getDetailedStats: (params) => api.get('/admin/stats/detailed', { params }),
  exportCSV: (params) => api.get('/admin/stats/export', { params, responseType: 'blob' }),
  refund: (id, reason) => api.post(`/admin/reservations/${id}/refund`, { reason }),
  getPlanning: (date) => api.get('/admin/planning', { params: { date } }),
  getNotifications: () => api.get('/admin/notifications'),
  markRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllRead: () => api.patch('/admin/notifications/all/read'),
};

export const campService = {
  getAll: () => api.get('/camps'),
  getById: (id) => api.get(`/camps/${id}`),
  create: (data) => api.post('/camps', data),
  update: (id, data) => api.patch(`/camps/${id}`, data),
  delete: (id) => api.delete(`/camps/${id}`),
  register: (id, notes) => api.post(`/camps/${id}/register`, { notes }),
  getRegistrations: (id) => api.get(`/camps/${id}/registrations`),
};

export default api;

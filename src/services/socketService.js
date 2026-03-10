import { io } from 'socket.io-client';

// --- URL del servidor Socket.IO ---
// LOCAL: deriva de VITE_API_URL quitando "/api" → http://localhost:4000
// RAILWAY: usa la URL del backend desplegado (configurada en el dashboard)
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace('/api', '');

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: (cb) => cb({ token: localStorage.getItem('token') }),
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    randomizationFactor: 0.5,
    transports: ['websocket', 'polling'],
  });

  socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

import axios from 'axios';
import { API_URL } from '../utils/constants';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo redirigir al login cuando el 401 viene de una ruta PROTEGIDA
    // (token expirado o inválido). NO redirigir si el 401 viene del
    // propio endpoint de login (contraseña incorrecta), porque eso
    // causa un reload de la página y el usuario no ve el mensaje de error.
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

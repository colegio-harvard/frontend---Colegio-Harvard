import apiClient from './apiClient';

export const listarHilos = (params) => apiClient.get('/mensajes/hilos', { params });
export const crearHilo = (data) => {
  const formData = new FormData();
  formData.append('id_alumno', data.id_alumno);
  formData.append('asunto', data.asunto);
  formData.append('mensaje', data.mensaje);
  if (data.adjunto) formData.append('adjunto', data.adjunto);
  return apiClient.post('/mensajes/hilos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const obtenerMensajes = (id_hilo) => apiClient.get(`/mensajes/hilos/${id_hilo}`);
export const responderHilo = (id_hilo, data) => {
  const formData = new FormData();
  formData.append('mensaje', data.mensaje);
  if (data.adjunto) formData.append('adjunto', data.adjunto);
  return apiClient.post(`/mensajes/hilos/${id_hilo}/responder`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

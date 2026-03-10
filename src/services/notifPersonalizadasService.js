import apiClient from './apiClient';

export const crearNotifPersonalizada = (data) => apiClient.post('/notificaciones-personalizadas', data);
export const listarNotifPersonalizadas = () => apiClient.get('/notificaciones-personalizadas');
export const eliminarNotifPersonalizada = (id) => apiClient.delete(`/notificaciones-personalizadas/${id}`);
export const aceptarModalPersonalizado = (id) => apiClient.put(`/notificaciones-personalizadas/${id}/aceptar-modal`);

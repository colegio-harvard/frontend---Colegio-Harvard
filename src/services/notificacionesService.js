import apiClient from './apiClient';

export const listarNotificaciones = () => apiClient.get('/notificaciones');
export const marcarLeida = (id) => apiClient.put(`/notificaciones/${id}/leida`);
export const marcarTodasLeidas = () => apiClient.put('/notificaciones/todas-leidas');
export const contarNoLeidas = () => apiClient.get('/notificaciones/no-leidas');
export const listarPlantillas = () => apiClient.get('/notificaciones/plantillas');
export const actualizarPlantilla = (id, data) => apiClient.put(`/notificaciones/plantillas/${id}`, data);
export const verificarRecordatorioPension = () => apiClient.get('/notificaciones/verificar-pension');
export const obtenerConfigPension = () => apiClient.get('/notificaciones/config-pension');
export const actualizarConfigPension = (data) => apiClient.put('/notificaciones/config-pension', data);
export const obtenerModalPendiente = () => apiClient.get('/notificaciones/modal-pendiente');

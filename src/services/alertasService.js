import apiClient from './apiClient';

export const ejecutarAlertas = () => apiClient.post('/alertas/ejecutar');
export const listarAlertasPadre = () => apiClient.get('/alertas/padre');
export const listarAlertasAdmin = (params) => apiClient.get('/alertas/admin', { params });

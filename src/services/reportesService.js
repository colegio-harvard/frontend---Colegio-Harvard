import apiClient from './apiClient';

export const listarReportes = (params) => apiClient.get('/reportes-semanales', { params });
export const crearReporte = (data) => apiClient.post('/reportes-semanales', data);
export const firmarReporte = (data) => apiClient.post('/reportes-semanales/firmar', data);

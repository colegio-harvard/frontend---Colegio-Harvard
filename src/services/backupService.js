import apiClient from './apiClient';

export const descargarRespaldoSistema = () => apiClient.get('/backup/sistema', { responseType: 'blob' });
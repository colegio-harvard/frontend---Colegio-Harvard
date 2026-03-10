import apiClient from './apiClient';

export const listarAgenda = (params) => apiClient.get('/agenda', { params });
export const publicarAgenda = (data) => apiClient.post('/agenda', data);
export const publicarAgendaMasivo = (data) => apiClient.post('/agenda/masivo', data);
export const firmarAgenda = (data) => apiClient.post('/agenda/firmar', data);
export const responderAgenda = (data) => apiClient.post('/agenda/responder', data);

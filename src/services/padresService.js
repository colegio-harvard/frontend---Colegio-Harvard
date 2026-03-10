import apiClient from './apiClient';

export const listarPadres = (params) => apiClient.get('/padres', { params });
export const obtenerPadre = (id) => apiClient.get(`/padres/${id}`);
export const crearPadre = (data) => apiClient.post('/padres', data);
export const actualizarPadre = (id, data) => apiClient.put(`/padres/${id}`, data);
export const eliminarPadre = (id) => apiClient.delete(`/padres/${id}`);
export const buscarPadres = (q) => apiClient.get('/padres/buscar', { params: { q } });

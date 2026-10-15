import apiClient from './apiClient';

export const listarBloques = (params) => apiClient.get('/horarios/bloques', { params });
export const crearBloque = (data) => apiClient.post('/horarios/bloques', data);
export const actualizarBloque = (id, data) => apiClient.put(`/horarios/bloques/${id}`, data);
export const desactivarBloque = (id) => apiClient.patch(`/horarios/bloques/${id}/desactivar`);
export const listarHorarios = (params) => apiClient.get('/horarios', { params });
export const crearHorario = (data) => apiClient.post('/horarios', data);
export const obtenerHorario = (id) => apiClient.get(`/horarios/${id}`);
export const actualizarHorario = (id, data = {}) => apiClient.put(`/horarios/${id}`, data);
export const agregarClase = (id, data) => apiClient.post(`/horarios/${id}/clases`, data);
export const modificarClase = (id, idDetalle, data) => apiClient.put(`/horarios/${id}/clases/${idDetalle}`, data);
export const eliminarClase = (id, idDetalle) => apiClient.delete(`/horarios/${id}/clases/${idDetalle}`);
export const validarHorario = (id) => apiClient.post(`/horarios/${id}/validar`);
export const publicarHorario = (id) => apiClient.post(`/horarios/${id}/publicar`);
export const archivarHorario = (id) => apiClient.post(`/horarios/${id}/archivar`);
export const listarAsignaciones = (params) => apiClient.get('/horarios/asignaciones', { params });
export const obtenerMisHorarios = () => apiClient.get('/horarios/padre/mis-horarios');

import apiClient from './apiClient';

export const listarComunicados = () => apiClient.get('/comunicados');
export const crearComunicado = (data) => apiClient.post('/comunicados', data);
export const listarComunicadosPorAlumno = (id) => apiClient.get(`/comunicados/alumno/${id}`);
export const marcarLeido = (id) => apiClient.put(`/comunicados/${id}/leido`);

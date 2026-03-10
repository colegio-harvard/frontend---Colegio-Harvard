import apiClient from './apiClient';

export const listarAlumnos = (params) => apiClient.get('/alumnos', { params });
export const obtenerAlumno = (id) => apiClient.get(`/alumnos/${id}`);
export const crearAlumno = (formData) => apiClient.post('/alumnos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const actualizarAlumno = (id, formData) => apiClient.put(`/alumnos/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const subirFotoAlumno = (id, formData) => apiClient.post(`/alumnos/${id}/foto`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const obtenerCarnet = (id_alumno) => apiClient.get(`/alumnos/carnet/${id_alumno}`);
export const vincularPadre = (data) => apiClient.post('/alumnos/vincular', data);
export const desvincularPadre = (id_alumno) => apiClient.delete(`/alumnos/desvincular/${id_alumno}`);
export const reemitirCarnet = (id_alumno) => apiClient.post(`/alumnos/reemitir-carnet/${id_alumno}`);

import apiClient from './apiClient';

export const registrarAsistencia = (data) => apiClient.post('/asistencia/registrar', data);
export const calendarioAlumno = (params) => apiClient.get('/asistencia/calendario', { params });
export const obtenerHijosPadre = () => apiClient.get('/asistencia/hijos');
export const asistenciaHoy = (params) => apiClient.get('/asistencia/hoy', { params });
export const obtenerAulasTutor = () => apiClient.get('/asistencia/aulas-tutor');
export const asistenciaGlobal = (params) => apiClient.get('/asistencia/global', { params });
export const exportarExcelAsistencia = (params) => apiClient.get('/asistencia/exportar-excel', { params, responseType: 'blob' });
export const corregirAsistencia = (data) => apiClient.post('/asistencia/corregir', data);
export const historialPorteria = () => apiClient.get('/asistencia/historial-porteria');
export const dashboardAdmin = () => apiClient.get('/asistencia/dashboard-admin');

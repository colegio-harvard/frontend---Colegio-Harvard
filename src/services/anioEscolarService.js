import apiClient from './apiClient';

export const migrarAlumnos = (data) => apiClient.post('/anio-escolar/migrar', data);
export const clonarAulas = (data) => apiClient.post('/anio-escolar/clonar-aulas', data);

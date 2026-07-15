import apiClient from './apiClient';

export const cargarLibretas = () => apiClient.get('/libretas/bootstrap');
export const crearArea = data => apiClient.post('/libretas/areas', data);
export const crearCurso = data => apiClient.post('/libretas/cursos', data);
export const asignarCurso = data => apiClient.post('/libretas/asignaciones', data);
export const cambiarPeriodo = (id, estado) => apiClient.put(`/libretas/periodos/${id}`, { estado });
export const cargarNotas = params => apiClient.get('/libretas/notas', { params });
export const guardarNotas = data => apiClient.post('/libretas/notas', data);
export const guardarComentarioDocente = data => apiClient.post('/libretas/comentarios-docente', data);
export const guardarAcompanamiento = data => apiClient.post('/libretas/acompanamiento', data);
export const crearOpcionCatalogo = data => apiClient.post('/libretas/catalogo', data);
export const cargarMerito = params => apiClient.get('/libretas/merito', { params });
export const cargarLibreta = id => apiClient.get(`/libretas/libreta/${id}`);
export const cargarAuditoriaNotas = () => apiClient.get('/libretas/auditoria');

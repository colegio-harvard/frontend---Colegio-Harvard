import apiClient from './apiClient';

// Anios escolares
export const listarAnios = () => apiClient.get('/config-escolar/anios');
export const crearAnio = (data) => apiClient.post('/config-escolar/anios', data);
export const activarAnio = (id) => apiClient.put(`/config-escolar/anios/${id}/activar`);

// Niveles
export const listarNiveles = () => apiClient.get('/config-escolar/niveles');
export const crearNivel = (data) => apiClient.post('/config-escolar/niveles', data);

// Grados
export const listarGrados = (params) => apiClient.get('/config-escolar/grados', { params });
export const crearGrado = (data) => apiClient.post('/config-escolar/grados', data);

// Aulas
export const listarAulas = (params) => apiClient.get('/config-escolar/aulas', { params });
export const obtenerAula = (id) => apiClient.get(`/config-escolar/aulas/${id}`);
export const crearAula = (data) => apiClient.post('/config-escolar/aulas', data);

// Asignacion tutores
export const asignarTutor = (data) => apiClient.post('/config-escolar/aulas/asignar-tutor', data);

// Calendario
export const obtenerCalendario = (id_anio_escolar) => apiClient.get(`/config-escolar/calendario/${id_anio_escolar}`);
export const actualizarDiaCalendario = (data) => apiClient.post('/config-escolar/calendario', data);

// Puntos escaneo
export const listarPuntosEscaneo = () => apiClient.get('/config-escolar/puntos-escaneo');
export const crearPuntoEscaneo = (data) => apiClient.post('/config-escolar/puntos-escaneo', data);

// Asignacion porteria
export const asignarPorteria = (data) => apiClient.post('/config-escolar/puntos-escaneo/asignar-porteria', data);

// Horarios por nivel
export const listarHorarios = (params) => apiClient.get('/config-escolar/horarios', { params });
export const guardarHorario = (data) => apiClient.post('/config-escolar/horarios', data);

// Datos del colegio (landing)
export const obtenerColegio = () => apiClient.get('/config-escolar/colegio');
export const actualizarColegio = (data) => apiClient.put('/config-escolar/colegio', data);

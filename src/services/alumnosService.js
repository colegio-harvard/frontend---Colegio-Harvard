import apiClient from './apiClient';

export const listarAlumnos = (params) => apiClient.get('/alumnos', { params });
export const obtenerAlumno = (id) => apiClient.get(`/alumnos/${id}`);
export const crearAlumno = (formData) => apiClient.post('/alumnos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const actualizarAlumno = (id, formData) => apiClient.put(`/alumnos/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const subirFotoAlumno = (id, formData) => apiClient.post(`/alumnos/${id}/foto`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const subirFotoCarnetAlumno = (id, formData) => apiClient.post(`/alumnos/${id}/foto-carnet`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const obtenerCarnet = (id_alumno) => apiClient.get(`/alumnos/carnet/${id_alumno}`);
export const vincularPadre = (data) => apiClient.post('/alumnos/vincular', data);
export const desvincularPadre = (id_alumno) => apiClient.delete(`/alumnos/desvincular/${id_alumno}`);
export const reemitirCarnet = (id_alumno) => apiClient.post(`/alumnos/reemitir-carnet/${id_alumno}`);
export const eliminarAlumno = (id) => apiClient.delete(`/alumnos/${id}`);
export const obtenerInventarioEliminacionAlumno = (id) => apiClient.get(`/alumnos/${id}/eliminacion-permanente`);
export const eliminarAlumnoPermanentemente = (id, data) => apiClient.post(`/alumnos/${id}/eliminacion-permanente`, data);
export const obtenerInfoRetiroAlumno = (id) => apiClient.get(`/alumnos/${id}/retiro`);
export const retirarAlumno = (id, data) => apiClient.post(`/alumnos/${id}/retirar`, data);
export const reactivarAlumno = (id, data) => apiClient.post(`/alumnos/${id}/reactivar`, data);
export const obtenerAlertaOperativaAlumno = (id) => apiClient.get(`/alumnos/${id}/alerta-operativa`);
export const listarAlertasOperativas = (params) => apiClient.get('/alumnos/alertas-operativas', { params });
export const guardarAlertaOperativaAlumno = (id, data) => apiClient.put(`/alumnos/${id}/alerta-operativa`, data);
export const resolverAlertaOperativaAlumno = (id) => apiClient.delete(`/alumnos/${id}/alerta-operativa`);
export const actualizarSiagieAlumno = (id, inscrito) => apiClient.patch(`/alumnos/${id}/siagie`, { inscrito });

export const obtenerSiguienteCodigoAlumno = () => apiClient.get('/alumnos/siguiente-codigo');
export const exportarAulasExcel = () => apiClient.get('/alumnos/exportar-aulas-excel', { responseType: 'blob' });


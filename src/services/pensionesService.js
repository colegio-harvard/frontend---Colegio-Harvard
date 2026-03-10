import apiClient from './apiClient';

export const obtenerPlantilla = () => apiClient.get('/pensiones/plantilla');
export const obtenerEstadoPension = (id_alumno) => apiClient.get(`/pensiones/estado/${id_alumno}`);
export const registrarPago = (data) => apiClient.post('/pensiones/registrar-pago', data);
export const obtenerDetalleMes = (id_alumno, clave_mes) => apiClient.get(`/pensiones/detalle/${id_alumno}/${clave_mes}`);
export const cuadriculaPensiones = (params) => apiClient.get('/pensiones/cuadricula', { params });

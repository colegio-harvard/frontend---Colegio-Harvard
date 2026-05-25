import apiClient from './apiClient';

export const obtenerPlantilla = () => apiClient.get('/pensiones/plantilla');
export const obtenerEstadoPension = (id_alumno) => apiClient.get(`/pensiones/estado/${id_alumno}`);
export const registrarPago = (data) => apiClient.post('/pensiones/registrar-pago', data);
export const obtenerDetalleMes = (id_alumno, clave_mes) => apiClient.get(`/pensiones/detalle/${id_alumno}/${clave_mes}`);
export const cuadriculaPensiones = (params) => apiClient.get('/pensiones/cuadricula', { params });
export const obtenerTicketPension = (codigo) => apiClient.get(`/pensiones/ticket/${codigo}`);
export const listarTicketsPension = (params) => apiClient.get('/pensiones/tickets', { params });

export const previewImportacionPensiones = (formData) => apiClient.post('/pensiones/importar-excel/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const aplicarImportacionPensiones = (formData) => apiClient.post('/pensiones/importar-excel/aplicar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const exportarReportePagosExcel = () => apiClient.get('/pensiones/reporte-pagos/exportar-excel', { responseType: 'blob' });
export const exportarDeudoresPensionesExcel = (params) => apiClient.get('/pensiones/deudores/exportar-excel', { params, responseType: 'blob' });

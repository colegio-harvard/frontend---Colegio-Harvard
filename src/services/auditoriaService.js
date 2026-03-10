import apiClient from './apiClient';

export const listarAuditoria = (params) => apiClient.get('/auditoria', { params });
export const listarAcciones = () => apiClient.get('/auditoria/acciones');
export const exportarExcelAuditoria = (params) => apiClient.get('/auditoria/exportar-excel', { params, responseType: 'blob' });

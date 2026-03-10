import apiClient from './apiClient';

export const listarRoles = () => apiClient.get('/usuarios/roles');
export const listarUsuarios = (params) => apiClient.get('/usuarios', { params });
export const crearUsuario = (data) => apiClient.post('/usuarios', data);
export const actualizarUsuario = (id, data) => apiClient.put(`/usuarios/${id}`, data);
export const resetearContrasena = (id, data) => apiClient.put(`/usuarios/${id}/reset-password`, data);
export const eliminarUsuario = (id) => apiClient.delete(`/usuarios/${id}`);

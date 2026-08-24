import apiClient from './apiClient';

export const listarCandidatosCobranza = () => apiClient.get('/cobranzas/candidatos');
export const registrarCompromisoPago = (data) => apiClient.post('/cobranzas/compromisos', data);
export const actualizarCompromisoPago = (id, estado) => apiClient.patch(`/cobranzas/compromisos/${id}`, { estado });
export const prepararMensajesCobranza = (canal, ids) => apiClient.post('/cobranzas/mensajes/preparar', {
  canal,
  ids_estado_pension: ids,
});
export const listarColaCobranza = (params = {}) => apiClient.get('/cobranzas/mensajes/cola', { params });
export const actualizarEstadoMensaje = (id, estado, error = null) => apiClient.patch(`/cobranzas/mensajes/${id}/estado`, { estado, error });




import axios from 'axios';
import apiClient from './apiClient';
import { API_URL } from '../utils/constants';

const publicClient = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

export const cargarMatriculas = () => apiClient.get('/matriculas/bootstrap');
export const guardarConfiguracionMatricula = (data) => apiClient.put('/matriculas/configuracion', data);
export const generarInvitacionMatricula = (id_alumno) => apiClient.post('/matriculas/invitar', { id_alumno });
export const obtenerExpedienteMatricula = (id) => apiClient.get(`/matriculas/${id}`);
export const guardarBorradorAsistidoMatricula = (id, borrador) => apiClient.put(`/matriculas/${id}/borrador-asistido`, { borrador });
export const guardarControlDocumentalMatricula = (id, control_documental) => apiClient.put(`/matriculas/${id}/control-documental`, { control_documental });
export const revisarMatricula = (id, data) => apiClient.put(`/matriculas/${id}/revisar`, data);
export const obtenerMatriculaPublica = (token) => publicClient.get(`/matriculas/publica/${token}`);
export const aceptarMatriculaPublica = (token, data) => publicClient.post(`/matriculas/publica/${token}/aceptar`, data);
export const solicitarCorreccionMatriculaPublica = (token, observacion) => publicClient.post(`/matriculas/publica/${token}/solicitar-correccion`, { observacion });


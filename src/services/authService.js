import apiClient from './apiClient';

export const login = async (username, contrasena) => {
  const { data } = await apiClient.post('/auth/login', { username, contrasena });
  return data;
};

export const getUsuarioGuardado = () => {
  const raw = localStorage.getItem('usuario');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getToken = () => localStorage.getItem('token');

export const guardarSesion = (token, usuario) => {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
};

export const cerrarSesion = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
};

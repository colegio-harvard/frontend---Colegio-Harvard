// --- URL base del API ---
// LOCAL: viene del .env local (http://localhost:4000/api)
// RAILWAY: viene de la variable VITE_API_URL configurada en el dashboard
// El fallback a localhost es solo para desarrollo — nunca aplica en Railway.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const UPLOADS_BASE = API_URL.replace(/\/api\/?$/, '');

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  TUTOR: 'TUTOR',
  PADRE: 'PADRE',
  PORTERIA: 'PORTERIA',
  PSICOLOGIA: 'PSICOLOGIA',
};

export const ROLES_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  TUTOR: 'Tutor',
  PADRE: 'Padre de Familia',
  PORTERIA: 'Porteria',
  PSICOLOGIA: 'Psicología',
};

export const ESTADO_ASISTENCIA = {
  PRESENTE: 'PRESENTE',
  TARDE: 'TARDE',
  AUSENTE: 'AUSENTE',
};

export const ESTADO_ASISTENCIA_LABELS = {
  PRESENTE: { label: 'Presente', color: 'bg-emerald-100 text-emerald-800' },
  TARDE: { label: 'Tarde', color: 'bg-amber-100 text-amber-800' },
  AUSENTE: { label: 'Ausente', color: 'bg-red-100 text-red-800' },
};

export const PRIORIDAD_COMUNICADO = {
  ALTA: 'ALTA',
  NORMAL: 'NORMAL',
};

export const AUDIENCIA_COMUNICADO = {
  COLEGIO: 'COLEGIO',
  NIVEL: 'NIVEL',
  AULA: 'AULA',
  ALUMNO: 'ALUMNO',
};

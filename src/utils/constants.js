// --- URL base del API ---
// LOCAL: viene del .env local (http://localhost:4000/api)
// RAILWAY: viene de la variable VITE_API_URL configurada en el dashboard
// El fallback a localhost es solo para desarrollo - nunca aplica en Railway.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const UPLOADS_BASE = API_URL.replace(/\/api\/?$/, '');

const storageKeyFromPath = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  let pathname = normalized;
  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname.toLowerCase().endsWith('wasabisys.com')) return null;
    pathname = parsed.pathname;
  } catch {
    // Las claves y rutas relativas no necesitan convertirse en URL.
  }

  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Conserva la ruta original si contiene una codificación antigua inválida.
  }

  const segments = decoded.split('/').filter(Boolean);
  const prefixIndex = segments.findIndex(segment => segment === 'fotos' || segment === 'adjuntos');
  return prefixIndex >= 0 ? segments.slice(prefixIndex).join('/') : null;
};

// Helper: construye URL de archivo.
// - URLs de Wasabi se redirigen al proxy del backend (/api/archivos/...).
// - Rutas relativas legacy (/uploads/...) se prefijan con UPLOADS_BASE.
export const fileUrl = (path) => {
  if (!path) return null;
  const normalized = String(path).trim();
  const storageKey = storageKeyFromPath(normalized);
  if (storageKey) {
    return `${API_URL}/archivos?key=${encodeURIComponent(storageKey)}`;
  }
  // Las referencias antiguas pueden ser URLs publicas, /uploads/... o nombres
  // relativos. El backend conoce sus equivalencias historicas y evita que un
  // redeploy deje las fotos apuntando al disco efimero del servidor.
  return `${API_URL}/archivos?ref=${encodeURIComponent(normalized)}`;
};

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  TUTOR: 'TUTOR',
  DOCENTE: 'DOCENTE',
  PADRE: 'PADRE',
  PORTERIA: 'PORTERIA',
  PSICOLOGIA: 'PSICOLOGIA',
};

export const ROLES_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  TUTOR: 'Tutor',
  DOCENTE: 'Docente',
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
  PRESENTE: { label: 'Asistió', color: 'bg-emerald-100 text-emerald-800' },
  TARDE: { label: 'Tardanza', color: 'bg-amber-100 text-amber-800' },
  AUSENTE: { label: 'Faltó', color: 'bg-red-100 text-red-800' },
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



// Normaliza fechas civiles (YYYY-MM-DD o midnight UTC de @db.Date) a mediodía UTC
// para evitar que la conversión a America/Lima muestre el día anterior.
const toSafeDate = (fecha) => {
  const str = String(fecha);
  if (/^\d{4}-\d{2}-\d{2}(T00:00:00)?/.test(str)) {
    return new Date(str.slice(0, 10) + 'T12:00:00Z');
  }
  return new Date(str);
};

export const formatFecha = (fecha) => {
  if (!fecha) return '-';
  return toSafeDate(fecha).toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatFechaLarga = (fecha) => {
  if (!fecha) return '-';
  return toSafeDate(fecha).toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatHora = (fecha) => {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatFechaHora = (fecha) => {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Fecha civil de hoy en America/Lima como "YYYY-MM-DD".
 * Usar en lugar de new Date().toISOString().split('T')[0] que devuelve fecha UTC.
 */
export const todayLimaISO = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(now);
  return parts; // sv-SE produce "YYYY-MM-DD"
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str, max = 50) => {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
};

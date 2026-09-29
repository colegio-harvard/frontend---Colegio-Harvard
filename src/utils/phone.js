export const limpiarTelefono = (value) => String(value || '').replace(/\D/g, '');

export const normalizarTelefonoWhatsAppPeru = (value) => {
  const telefono = limpiarTelefono(value);
  if (/^9\d{8}$/.test(telefono)) return `51${telefono}`;
  if (/^519\d{8}$/.test(telefono)) return telefono;
  return null;
};

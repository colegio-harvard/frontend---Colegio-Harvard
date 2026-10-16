export const colorHorarioSeguro = (color) => /^#[0-9A-F]{6}$/i.test(String(color || '')) ? color : null;

const luminosidad = (color) => {
  const canales = [1, 3, 5].map(indice => parseInt(color.slice(indice, indice + 2), 16) / 255);
  const [rojo, verde, azul] = canales.map(canal => canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rojo + 0.7152 * verde + 0.0722 * azul;
};

export const estiloCursoHorario = (color) => {
  const seguro = colorHorarioSeguro(color);
  if (!seguro) return undefined;
  return { backgroundColor: seguro, color: luminosidad(seguro) < 0.42 ? '#FFFFFF' : '#542022' };
};

export const colorTextoSecundario = (color) => {
  const seguro = colorHorarioSeguro(color);
  if (!seguro) return undefined;
  return luminosidad(seguro) < 0.42 ? '#F8FAFC' : '#6B383A';
};

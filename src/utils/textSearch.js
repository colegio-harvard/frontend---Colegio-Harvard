export const normalizeSearchText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es')
  .replace(/\s+/g, ' ')
  .trim();

export const includesSearchText = (value, query) => normalizeSearchText(value).includes(normalizeSearchText(query));

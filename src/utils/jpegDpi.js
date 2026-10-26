const JFIF_HEADER_LENGTH = 18;

export const injectJpegDpi = (source, dpiX = 300, dpiY = dpiX) => {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('El archivo generado no es un JPEG válido');
  const densityX = Math.max(1, Math.min(65535, Math.round(dpiX)));
  const densityY = Math.max(1, Math.min(65535, Math.round(dpiY)));

  for (let index = 2; index + 15 < bytes.length;) {
    if (bytes[index] !== 0xff) break;
    const marker = bytes[index + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = (bytes[index + 2] << 8) | bytes[index + 3];
    if (marker === 0xe0 && length >= 16
      && bytes[index + 4] === 0x4a && bytes[index + 5] === 0x46
      && bytes[index + 6] === 0x49 && bytes[index + 7] === 0x46 && bytes[index + 8] === 0x00) {
      const result = bytes.slice();
      result[index + 11] = 1; // Unidad JFIF: puntos por pulgada.
      result[index + 12] = densityX >> 8;
      result[index + 13] = densityX & 0xff;
      result[index + 14] = densityY >> 8;
      result[index + 15] = densityY & 0xff;
      return result;
    }
    if (length < 2) break;
    index += length + 2;
  }

  const header = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x01, 0x01, densityX >> 8, densityX & 0xff,
    densityY >> 8, densityY & 0xff, 0x00, 0x00,
  ]);
  const result = new Uint8Array(bytes.length + JFIF_HEADER_LENGTH);
  result.set(bytes.subarray(0, 2), 0);
  result.set(header, 2);
  result.set(bytes.subarray(2), 2 + JFIF_HEADER_LENGTH);
  return result;
};

export const jpegDataUrlTo300DpiBlob = async (dataUrl, dpiX = 300, dpiY = dpiX) => {
  const response = await fetch(dataUrl);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return new Blob([injectJpegDpi(bytes, dpiX, dpiY)], { type: 'image/jpeg' });
};

export const descargarBlob = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = nombre;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

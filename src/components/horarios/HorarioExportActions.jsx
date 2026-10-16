import { useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { HiDownload, HiPhotograph, HiPrinter } from 'react-icons/hi';
import toast from 'react-hot-toast';

const capturar = (elemento) => toPng(elemento, {
  backgroundColor: '#fffdf9',
  cacheBust: true,
  pixelRatio: 2,
});

const descargar = (url, nombre) => {
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
};

export default function HorarioExportActions({ documentRef, archivoBase, className = '' }) {
  const [exportando, setExportando] = useState(false);
  const documento = () => documentRef.current;

  const imprimir = () => {
    if (!documento()) return;
    document.body.classList.add('horario-imprimiendo');
    const limpiar = () => {
      document.body.classList.remove('horario-imprimiendo');
      window.removeEventListener('afterprint', limpiar);
    };
    window.addEventListener('afterprint', limpiar);
    window.print();
  };

  const exportar = async (tipo) => {
    if (!documento()) return;
    setExportando(true);
    try {
      const imagen = await capturar(documento());
      if (tipo === 'png') {
        descargar(imagen, `${archivoBase}.png`);
      } else {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
        const propiedades = pdf.getImageProperties(imagen);
        const anchoMaximo = pdf.internal.pageSize.getWidth() - 16;
        const altoMaximo = pdf.internal.pageSize.getHeight() - 16;
        const escala = Math.min(anchoMaximo / propiedades.width, altoMaximo / propiedades.height);
        const ancho = propiedades.width * escala;
        const alto = propiedades.height * escala;
        pdf.addImage(imagen, 'PNG', (pdf.internal.pageSize.getWidth() - ancho) / 2, (pdf.internal.pageSize.getHeight() - alto) / 2, ancho, alto);
        pdf.save(`${archivoBase}.pdf`);
      }
    } catch {
      toast.error('No se pudo preparar la descarga del horario.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button type="button" className="btn-secondary flex items-center gap-2" onClick={imprimir}>
        <HiPrinter /> Imprimir
      </button>
      <button type="button" className="btn-secondary flex items-center gap-2" disabled={exportando} onClick={() => exportar('pdf')}>
        <HiDownload /> {exportando ? 'Preparando…' : 'Descargar PDF'}
      </button>
      <button type="button" className="btn-secondary flex items-center gap-2" disabled={exportando} onClick={() => exportar('png')}>
        <HiPhotograph /> Descargar imagen
      </button>
    </div>
  );
}

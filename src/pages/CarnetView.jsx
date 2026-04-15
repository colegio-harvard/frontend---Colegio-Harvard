import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CarnetCard from '../components/CarnetCard';
import apiClient from '../services/apiClient';
import { HiArrowLeft, HiDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { toJpeg } from 'html-to-image';

/* ─── Pre-fetch Google Fonts con base64 embebido (evita CORS SecurityError) ─── */
let _fontCSSPromise = null;

export function getEmbeddedFontCSS() {
  if (_fontCSSPromise) return _fontCSSPromise;
  _fontCSSPromise = (async () => {
    try {
      const res = await fetch(
        'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600&display=swap'
      );
      let css = await res.text();
      const urlMatches = [...css.matchAll(/url\(([^)]+)\)/g)];
      for (const m of urlMatches) {
        const rawUrl = m[1];
        const url = rawUrl.replace(/['"]/g, '');
        if (!url.startsWith('http')) continue;
        try {
          const fontRes = await fetch(url);
          const blob = await fontRes.blob();
          const dataUrl = await new Promise(r => {
            const reader = new FileReader();
            reader.onload = () => r(reader.result);
            reader.readAsDataURL(blob);
          });
          css = css.replaceAll(rawUrl, dataUrl);
        } catch { /* skip font file */ }
      }
      return css;
    } catch {
      return undefined;
    }
  })();
  return _fontCSSPromise;
}

const CarnetView = () => {
  const { id_alumno } = useParams();
  const navigate = useNavigate();
  const [carnetData, setCarnetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const carnetRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await apiClient.get(`/alumnos/carnet/${id_alumno}`);
        setCarnetData(data.data);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Error al cargar carnet');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id_alumno]);

  const handleDescargar = async () => {
    if (!carnetData || !carnetRef.current) return;
    try {
      const fontCSS = await getEmbeddedFontCSS();
      const el = carnetRef.current;

      // Envolver en contenedor con padding para evitar recorte de bordes
      // (SVG foreignObject de Chrome recorta contenido en el borde exacto)
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:inline-block;padding:4px;';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      let dataUrl;
      try {
        dataUrl = await toJpeg(wrapper, {
          quality: 0.95,
          pixelRatio: 3,
          cacheBust: true,
          backgroundColor: '#ffffff',
          fontEmbedCSS: fontCSS,
        });
      } finally {
        // Restaurar DOM original
        wrapper.parentNode.insertBefore(el, wrapper);
        wrapper.remove();
      }

      const link = document.createElement('a');
      link.download = `fotocheck-${carnetData.alumno.codigo_alumno}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error('Error al descargar el fotocheck');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!carnetData) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 text-primary-800/70 hover:text-primary-800">
          <HiArrowLeft className="w-5 h-5" /> Volver
        </button>
        <Card><p className="text-center text-gold-600 py-8">No se pudo cargar el carnet</p></Card>
      </div>
    );
  }

  const { alumno, carnet } = carnetData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary-800/70 hover:text-primary-800">
          <HiArrowLeft className="w-5 h-5" /> Volver
        </button>
        <button onClick={handleDescargar} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
          <HiDownload className="w-4 h-4" /> Descargar JPG
        </button>
      </div>

      <div className="flex justify-center">
        <CarnetCard alumno={alumno} carnet={carnet} carnetRef={carnetRef} />
      </div>
    </div>
  );
};

export default CarnetView;

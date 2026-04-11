import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import apiClient from '../services/apiClient';
import { HiArrowLeft, HiDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { fileUrl } from '../utils/constants';
import logoHarvard from '../assets/insignia-harvard.jpeg';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
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

const PRINT_CSS = `
  @page { size: 90mm auto; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  html, body { width: 90mm; margin: 0; padding: 0; background: white; font-family: 'DM Sans', system-ui, sans-serif; display: flex; justify-content: center; align-items: flex-start; }
  .carnet { width: 100%; max-width: 340px; background: white; overflow: hidden; border: none; box-shadow: none; }
  .header { background: #000080 !important; background: linear-gradient(135deg, #000060 0%, #000080 50%, #000060 100%) !important; padding: 16px 20px 12px; text-align: center; }
  .logo { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid #E8BF4D; margin: 0 auto 8px; display: block; }
  .school-name { color: #E8BF4D; font-family: 'Playfair Display', Georgia, serif; font-size: 52px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin: 0; line-height: 1; }
  .header-line { height: 1px; background: linear-gradient(90deg, transparent, #C5963A, transparent); margin: 8px 0 0; }
  .photo-section { display: flex; justify-content: center; margin-top: -20px; position: relative; z-index: 1; }
  .photo-ring { width: 88px; height: 88px; border-radius: 50%; background: #D4A843 !important; background: linear-gradient(135deg, #C5963A, #E8BF4D, #C5963A) !important; padding: 3px; box-shadow: 0 4px 6px rgba(197,150,58,0.15); }
  .photo { width: 82px; height: 82px; border-radius: 50%; object-fit: cover; border: 2px solid white; display: block; }
  .photo-placeholder { width: 82px; height: 82px; border-radius: 50%; background: #FDF8F3 !important; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: #C5963A; font-weight: 700; box-sizing: border-box; }
  .info { padding: 12px 24px 16px; text-align: center; }
  .nombre { font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: #000080; margin: 0 0 4px; line-height: 1.3; }
  .nombre-sm { font-size: 16px; }
  .codigo { font-size: 14px; color: #000000; font-weight: 600; margin: 0 0 2px; }
  .nivel { font-size: 14px; color: #000000; margin: 0; }
  .qr-section { margin: 0 24px 16px; background: #FFFCF8 !important; border: 1px solid #F5EDE3; border-radius: 8px; padding: 10px 12px; }
  .qr-label { font-size: 9px; font-weight: 600; color: #000000; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px; text-align: center; }
  .qr-img { width: 120px; height: 120px; display: block; margin: 0 auto; }
  .footer { background: #000080 !important; background: linear-gradient(90deg, #000060, #000080, #000060) !important; padding: 6px 16px; display: flex; justify-content: space-between; align-items: center; }
  .footer-text { font-size: 9px; color: rgba(232,191,77,0.55); margin: 0; }
`;

const buildPrintHTML = ({ alumno, carnet, logoUrl, fotoUrl, qrDataUrl }) => {
  const initial = alumno.nombre_completo?.charAt(0) || '?';
  const images = [logoUrl, fotoUrl].filter(Boolean);
  const imgCount = images.length;
  const nombreClass = (alumno.nombre_completo?.length || 0) > 35 ? 'nombre nombre-sm' : 'nombre';
  return `<html><head><title>Carnet - ${alumno.nombre_completo}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>${PRINT_CSS}</style></head><body>
    <div class="carnet">
      <div class="header">
        <img class="logo" src="${logoUrl}" onload="window.__imgLoaded()" onerror="window.__imgLoaded()" />
        <p class="school-name">Colegio Harvard</p>
        <div class="header-line"></div>
      </div>
      <div class="photo-section">
        <div class="photo-ring">
          ${fotoUrl
            ? `<img class="photo" src="${fotoUrl}" onload="window.__imgLoaded()" onerror="window.__imgLoaded()" />`
            : `<div class="photo-placeholder">${initial}</div>`
          }
        </div>
      </div>
      <div class="info">
        <p class="${nombreClass}">${alumno.nombre_completo}</p>
        <p class="codigo">${alumno.codigo_alumno}</p>
        <p class="nivel">${alumno.nivel} \u2014 ${alumno.aula}</p>
      </div>
      <div class="qr-section">
        <p class="qr-label">Codigo de Identificacion</p>
        <img class="qr-img" src="${qrDataUrl}" />
      </div>
      <div class="footer">
        <p class="footer-text">v${carnet.version}</p>
        <p class="footer-text">2026</p>
      </div>
    </div>
    <script>
      var __loaded = 0;
      var __total = ${imgCount};
      window.__imgLoaded = function() {
        __loaded++;
        if (__loaded >= __total) {
          setTimeout(function() { window.print(); }, 300);
        }
      };
      if (__total === 0) setTimeout(function() { window.print(); }, 300);
    </script>
    </body></html>`;
};

const CarnetCard = ({ alumno, carnet, carnetRef }) => (
  <div ref={carnetRef} className="w-[340px] bg-white rounded-2xl overflow-hidden shadow-gold-lg border border-cream-200">
    {/* Header azul con logo y nombre del colegio */}
    <div className="px-5 pt-4 pb-3 text-center" style={{ background: 'linear-gradient(135deg, #000060 0%, #000080 50%, #000060 100%)' }}>
      <img src={logoHarvard} alt="Colegio Harvard" className="w-[72px] h-[72px] rounded-full mx-auto mb-2 border-[3px] border-gold-400 object-cover" />
      <h3 className="text-gold-400 font-display text-[52px] font-bold tracking-[0.04em] uppercase leading-none">Colegio Harvard</h3>
      <div className="mt-2 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
    </div>

    {/* Foto con anillo dorado */}
    <div className="flex justify-center -mt-5 relative z-10">
      <div className="w-[88px] h-[88px] rounded-full bg-gold-gradient p-[3px] shadow-gold-md">
        {alumno.foto_url ? (
          <img src={fileUrl(alumno.foto_url)} alt={alumno.nombre_completo}
            className="w-full h-full rounded-full object-cover border-2 border-white" />
        ) : (
          <div className="w-full h-full rounded-full bg-cream-100 border-2 border-white flex items-center justify-center">
            <span className="text-gold-600 font-bold text-[28px] font-display">{alumno.nombre_completo?.charAt(0)}</span>
          </div>
        )}
      </div>
    </div>

    {/* Info del alumno */}
    <div className="px-6 pt-3 pb-4 text-center">
      <h2 className={`font-bold font-display leading-tight ${alumno.nombre_completo?.length > 35 ? 'text-base' : 'text-xl'}`} style={{ color: '#000080' }}>{alumno.nombre_completo}</h2>
      <p className="text-sm text-black font-semibold mt-1">{alumno.codigo_alumno}</p>
      <p className="text-sm text-black mt-0.5">{alumno.nivel} — {alumno.aula}</p>

      {/* QR Code */}
      <div className="bg-cream-50 border border-cream-200 rounded-lg px-3 py-3 mt-3">
        <p className="text-[9px] font-semibold text-black uppercase tracking-[0.12em] mb-2">Codigo de Identificacion</p>
        <div className="flex justify-center">
          <QRCodeSVG
            value={carnet.qr_token}
            size={120}
            level="M"
            bgColor="#FFFCF8"
            fgColor="#000080"
            marginSize={1}
          />
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="px-4 py-1.5 flex justify-between items-center" style={{ background: 'linear-gradient(90deg, #000060, #000080, #000060)' }}>
      <p className="text-[9px] text-gold-400/55">v{carnet.version}</p>
      <p className="text-[9px] text-gold-400/55">2026</p>
    </div>
  </div>
);

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

export { PRINT_CSS, buildPrintHTML };
export default CarnetView;

import { fileUrl } from '../utils/constants';
import logoHarvard from '../assets/insignia-harvard.jpeg';
import { QRCodeSVG } from 'qrcode.react';

const CarnetCard = ({ alumno, carnet, carnetRef }) => {
  const anioActual = new Date().getFullYear();

  return (
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
        <h2 className={`font-bold font-display leading-tight ${(alumno.nombre_completo?.length || 0) > 35 ? 'text-base' : 'text-xl'}`} style={{ color: '#000080' }}>{alumno.nombre_completo}</h2>
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
        <p className="text-[9px] text-gold-400/55">{anioActual}</p>
      </div>
    </div>
  );
};

export default CarnetCard;

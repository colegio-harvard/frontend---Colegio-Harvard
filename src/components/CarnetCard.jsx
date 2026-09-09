import { fileUrl } from '../utils/constants';
import logoHarvard from '../assets/insignia-harvard-oficial.png';
import { QRCodeSVG } from 'qrcode.react';
import { HiAcademicCap, HiOutlineShieldCheck } from 'react-icons/hi';

export const CARNET_WIDTH = 250;
export const CARNET_HEIGHT = 410;
export const CARNET_EXPORT_WIDTH = 591;
export const CARNET_EXPORT_HEIGHT = 969;
export const CARNET_PIXEL_RATIO = CARNET_EXPORT_WIDTH / CARNET_WIDTH;

const separarNombreAlumno = (alumno) => {
  const nombresRegistrados = String(alumno.nombres || '').trim();
  const apellidosRegistrados = [alumno.apellido_paterno, alumno.apellido_materno].filter(Boolean).join(' ').trim();
  if (nombresRegistrados && apellidosRegistrados) {
    return { nombres: nombresRegistrados, apellidos: apellidosRegistrados };
  }

  const partes = String(alumno.nombre_completo || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return { nombres: partes[0] || '', apellidos: '' };
  if (partes.length === 2) return { nombres: partes[0], apellidos: partes[1] };
  return {
    nombres: partes.slice(0, -2).join(' '),
    apellidos: partes.slice(-2).join(' '),
  };
};

const tamanoLineaNombre = (texto) => {
  const longitud = texto.length;
  if (longitud > 30) return 'text-[9px]';
  if (longitud > 25) return 'text-[10px]';
  if (longitud > 21) return 'text-[11px]';
  if (longitud > 17) return 'text-[13px]';
  return 'text-[16px]';
};

const CarnetCard = ({ alumno, carnet, carnetRef }) => {
  const anioActual = new Date().getFullYear();
  const { nombres, apellidos } = separarNombreAlumno(alumno);

  return (
    <div ref={carnetRef} className="relative flex shrink-0 flex-col overflow-hidden rounded-[14px] border-2 border-[#000070] bg-white shadow-gold-lg" style={{ width: CARNET_WIDTH, height: CARNET_HEIGHT }}>
      <div className="pointer-events-none absolute inset-[5px] z-10 rounded-[11px] border-2 border-gold-400" aria-hidden="true" />
      <header className="relative flex h-[76px] shrink-0 items-center gap-2.5 px-3 pb-1 text-white" style={{ background: 'linear-gradient(135deg, #000060 0%, #000080 50%, #000060 100%)' }}>
        <img src={logoHarvard} alt="Insignia del Colegio Harvard" className="h-[50px] w-[50px] shrink-0 rounded-full border-2 border-gold-400 bg-white object-contain" />
        <div className="relative z-10 min-w-0 text-left font-display font-bold uppercase leading-none">
          <p className="text-[16px] tracking-[0.04em] text-white">Colegio</p>
          <p className="text-[27px] tracking-[0.025em] text-white">Harvard</p>
        </div>
        <div className="absolute bottom-[-1px] left-[5px] right-[5px] z-20 h-[10px] rounded-t-[18px] border-x-2 border-t-2 border-gold-400 bg-white" aria-hidden="true" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center px-3 pt-0.5 text-center">
        <div className="h-[84px] w-[118px] shrink-0 overflow-hidden rounded-[12px] border-2 border-gold-400 bg-cream-100 shadow-sm">
          {alumno.foto_url ? (
            <img key={`${alumno.id}-${alumno.foto_carnet_url || alumno.foto_url}`} src={fileUrl(alumno.foto_carnet_url || alumno.foto_url)} alt={alumno.nombre_completo} onError={(event) => { const original = fileUrl(alumno.foto_url); if (original && event.currentTarget.src !== original) event.currentTarget.src = original; }} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cream-100"><span className="font-display text-[30px] font-bold text-gold-600">{alumno.nombre_completo?.charAt(0)}</span></div>
          )}
        </div>

        <h2 className="mt-1.5 flex h-[34px] w-full shrink-0 flex-col items-center justify-center font-display font-bold leading-[1.02] text-[#000080]">
          <span className={`block max-w-full whitespace-nowrap ${tamanoLineaNombre(nombres)}`}>{nombres}</span>
          <span className={`block max-w-full whitespace-nowrap ${tamanoLineaNombre(apellidos)}`}>{apellidos}</span>
        </h2>

        <div className="mt-1 flex w-full items-center justify-center gap-2 border-t border-gold-300 pt-1 text-[10px] font-semibold text-black">
          <span>{alumno.codigo_alumno}</span><span className="text-gold-500">·</span><span>DNI {alumno.dni || 'pendiente'}</span>
        </div>

        <div className="mt-1 flex h-[23px] w-full shrink-0 items-center justify-center gap-2 rounded-md border-2 border-gold-400 bg-[#000070] px-2 text-[11px] font-semibold text-white">
          <HiAcademicCap className="h-[17px] w-[17px] shrink-0 text-gold-400" />
          <span>{alumno.nivel} · {alumno.aula}</span>
        </div>

        <div className="mb-5 mt-1.5 flex flex-1 items-start justify-center">
          <div className="rounded-[10px] border-2 border-gold-400 bg-white p-[4px]">
            <QRCodeSVG value={carnet.qr_token} size={92} level="M" bgColor="#FFFFFF" fgColor="#000060" marginSize={1} />
          </div>
        </div>
      </main>

      <footer className="relative z-20 h-[28px] shrink-0 border-t-2 border-gold-400 text-white" style={{ background: 'linear-gradient(90deg, #000060, #000080, #000060)' }}>
        <div className="absolute -top-[2px] left-[5px] right-[5px] z-20 h-[10px] rounded-b-[18px] border-x-2 border-b-2 border-gold-400 bg-white" aria-hidden="true" />
        <div className="absolute bottom-0 left-1/2 z-30 flex h-[33px] w-[112px] -translate-x-1/2 items-center justify-center gap-1.5 rounded-t-[22px] border-x-2 border-t-2 border-gold-400 bg-[#000070] text-[11px] font-semibold shadow-sm">
          <HiOutlineShieldCheck className="h-[13px] w-[13px] text-gold-400" />
          <span>Válido {anioActual}</span>
        </div>
      </footer>
    </div>
  );
};

export default CarnetCard;

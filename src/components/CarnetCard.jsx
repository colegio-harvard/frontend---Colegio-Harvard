import { fileUrl } from '../utils/constants';
import logoHarvard from '../assets/insignia-harvard-oficial.png';
import { QRCodeSVG } from 'qrcode.react';
import { HiAcademicCap, HiOutlineShieldCheck } from 'react-icons/hi';

export const CARNET_WIDTH = 250;
export const CARNET_HEIGHT = 410;
export const CARNET_EXPORT_WIDTH = 591;
export const CARNET_EXPORT_HEIGHT = 969;
export const CARNET_PIXEL_RATIO = CARNET_EXPORT_WIDTH / CARNET_WIDTH;

const CarnetCard = ({ alumno, carnet, carnetRef }) => {
  const anioActual = new Date().getFullYear();
  const longitudNombre = alumno.nombre_completo?.length || 0;
  const claseNombre = longitudNombre > 42 ? 'text-[12px]' : longitudNombre > 30 ? 'text-[14px]' : 'text-[16px]';

  return (
    <div ref={carnetRef} className="relative flex shrink-0 flex-col overflow-hidden rounded-[14px] border-2 border-[#000070] bg-white shadow-gold-lg" style={{ width: CARNET_WIDTH, height: CARNET_HEIGHT }}>
      <div className="pointer-events-none absolute inset-[5px] z-10 rounded-[11px] border-2 border-gold-400" aria-hidden="true" />
      <header className="relative flex h-[76px] shrink-0 items-center gap-2.5 px-3 pb-1 text-white" style={{ background: 'linear-gradient(135deg, #000060 0%, #000080 50%, #000060 100%)' }}>
        <img src={logoHarvard} alt="Insignia del Colegio Harvard" className="h-[50px] w-[50px] shrink-0 rounded-full border-2 border-gold-400 bg-white object-contain" />
        <div className="relative z-10 min-w-0 text-left font-display font-bold uppercase leading-none">
          <p className="text-[16px] tracking-[0.04em] text-white">Colegio</p>
          <p className="text-[27px] tracking-[0.025em] text-white">Harvard</p>
        </div>
        <div className="absolute bottom-[-1px] left-[29px] right-[29px] h-[10px] rounded-t-[18px] border-x-2 border-t-2 border-gold-400 bg-white" aria-hidden="true" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center px-3 pt-1 text-center">
        <div className="h-[84px] w-[118px] shrink-0 overflow-hidden rounded-[12px] border-2 border-gold-400 bg-cream-100 shadow-sm">
          {alumno.foto_url ? (
            <img key={`${alumno.id}-${alumno.foto_carnet_url || alumno.foto_url}`} src={fileUrl(alumno.foto_carnet_url || alumno.foto_url)} alt={alumno.nombre_completo} onError={(event) => { const original = fileUrl(alumno.foto_url); if (original && event.currentTarget.src !== original) event.currentTarget.src = original; }} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cream-100"><span className="font-display text-[30px] font-bold text-gold-600">{alumno.nombre_completo?.charAt(0)}</span></div>
          )}
        </div>

        <h2 className={`mt-2 max-w-full font-display font-bold leading-[1.05] text-[#000080] ${claseNombre}`}>{alumno.nombre_completo}</h2>

        <div className="mt-1.5 flex w-full items-center justify-center gap-2 border-t border-gold-300 pt-1 text-[10px] font-semibold text-black">
          <span>{alumno.codigo_alumno}</span><span className="text-gold-500">·</span><span>DNI {alumno.dni || 'pendiente'}</span>
        </div>

        <div className="mt-1.5 flex h-[23px] w-full shrink-0 items-center justify-center gap-2 rounded-md border-2 border-gold-400 bg-[#000070] px-2 text-[11px] font-semibold text-white">
          <HiAcademicCap className="h-[17px] w-[17px] shrink-0 text-gold-400" />
          <span>{alumno.nivel} · {alumno.aula}</span>
        </div>

        <div className="mb-2 mt-1.5 flex flex-1 items-center justify-center">
          <div className="rounded-[10px] border-2 border-gold-400 bg-white p-[4px]">
            <QRCodeSVG value={carnet.qr_token} size={96} level="M" bgColor="#FFFFFF" fgColor="#000060" marginSize={1} />
          </div>
        </div>
      </main>

      <footer className="relative z-20 h-[28px] shrink-0 border-t-2 border-gold-400 text-white" style={{ background: 'linear-gradient(90deg, #000060, #000080, #000060)' }}>
        <div className="absolute -top-[2px] left-0 z-20 h-[12px] w-[42px] rounded-br-[18px] border-b-2 border-r-2 border-gold-400 bg-white" aria-hidden="true" />
        <div className="absolute -top-[2px] right-0 z-20 h-[12px] w-[42px] rounded-bl-[18px] border-b-2 border-l-2 border-gold-400 bg-white" aria-hidden="true" />
        <div className="absolute bottom-0 left-1/2 z-30 flex h-[33px] w-[112px] -translate-x-1/2 items-center justify-center gap-1.5 rounded-t-[22px] border-x-2 border-t-2 border-gold-400 bg-[#000070] text-[11px] font-semibold shadow-sm">
          <HiOutlineShieldCheck className="h-[13px] w-[13px] text-gold-400" />
          <span>Válido {anioActual}</span>
        </div>
      </footer>
    </div>
  );
};

export default CarnetCard;

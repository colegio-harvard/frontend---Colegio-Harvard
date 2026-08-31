import { fileUrl } from '../utils/constants';
import logoHarvard from '../assets/insignia-harvard-oficial.png';
import { QRCodeSVG } from 'qrcode.react';

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
    <div ref={carnetRef} className="flex shrink-0 flex-col overflow-hidden rounded-[14px] border border-cream-200 bg-white shadow-gold-lg" style={{ width: CARNET_WIDTH, height: CARNET_HEIGHT }}>
      <header className="relative flex h-[72px] shrink-0 items-center gap-2.5 px-3 text-white" style={{ background: 'linear-gradient(135deg, #000060 0%, #000080 50%, #000060 100%)' }}>
        <img src={logoHarvard} alt="Insignia del Colegio Harvard" className="h-[50px] w-[50px] shrink-0 rounded-full border-2 border-gold-400 bg-white object-contain" />
        <div className="min-w-0 text-left font-display font-bold uppercase leading-none">
          <p className="text-[16px] tracking-[0.04em] text-white">Colegio</p>
          <p className="text-[27px] tracking-[0.025em] text-white">Harvard</p>
        </div>
        <div className="absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center px-3 pt-2 text-center">
        <div className="h-[84px] w-[118px] shrink-0 overflow-hidden rounded-[12px] border-2 border-gold-400 bg-cream-100 shadow-sm">
          {alumno.foto_url ? (
            <img key={`${alumno.id}-${alumno.foto_url}`} src={fileUrl(alumno.foto_url)} alt={alumno.nombre_completo} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cream-100"><span className="font-display text-[30px] font-bold text-gold-600">{alumno.nombre_completo?.charAt(0)}</span></div>
          )}
        </div>

        <h2 className={`mt-2 max-w-full font-display font-bold leading-[1.05] text-[#000080] ${claseNombre}`}>{alumno.nombre_completo}</h2>

        <div className="mt-1.5 flex w-full items-center justify-center gap-2 border-t border-gold-300 pt-1 text-[10px] font-semibold text-black">
          <span>{alumno.codigo_alumno}</span><span className="text-gold-500">·</span><span>DNI {alumno.dni || 'pendiente'}</span>
        </div>

        <div className="mt-1.5 flex h-[23px] w-full shrink-0 items-center justify-center rounded-md border border-gold-400 bg-[#000070] px-2 text-[11px] font-semibold text-white">{alumno.nivel} · {alumno.aula}</div>

        <div className="mb-2 mt-1.5 flex flex-1 items-center justify-center">
          <div className="rounded-[10px] border-2 border-gold-400 bg-white p-[5px]">
            <QRCodeSVG value={carnet.qr_token} size={104} level="M" bgColor="#FFFFFF" fgColor="#000060" marginSize={1} />
          </div>
        </div>
      </main>

      <footer className="flex h-[25px] shrink-0 items-center justify-center border-t border-gold-400 text-[11px] font-semibold text-white" style={{ background: 'linear-gradient(90deg, #000060, #000080, #000060)' }}>Válido {anioActual}</footer>
    </div>
  );
};

export default CarnetCard;

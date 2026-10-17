import { useRef, useState } from 'react';
import { HiMinus, HiPlus } from 'react-icons/hi';

const ESCALA_MINIMA = 0.28;
const ESCALA_MAXIMA = 1.6;
const PASO = 0.15;

const limitar = (valor) => Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, valor));
const distancia = ([primero, segundo]) => Math.hypot(segundo.clientX - primero.clientX, segundo.clientY - primero.clientY);

/** Controles locales para consultar una grilla ancha desde móvil. */
export default function HorarioZoomable({ children }) {
  const [escala, setEscala] = useState(1);
  const viewportRef = useRef(null);
  const punteros = useRef(new Map());
  const gesto = useRef(null);

  const cambiarEscala = (siguiente) => setEscala(limitar(siguiente));
  const ajustarAPantalla = () => {
    const ancho = viewportRef.current?.clientWidth || 0;
    if (ancho) cambiarEscala((ancho - 12) / 1120);
  };
  const iniciarToque = (evento) => {
    punteros.current.set(evento.pointerId, evento);
    if (punteros.current.size === 2) {
      const puntos = [...punteros.current.values()];
      gesto.current = { distancia: distancia(puntos), escala };
    }
  };
  const moverToque = (evento) => {
    if (!punteros.current.has(evento.pointerId)) return;
    punteros.current.set(evento.pointerId, evento);
    if (punteros.current.size !== 2 || !gesto.current?.distancia) return;
    evento.preventDefault();
    cambiarEscala(gesto.current.escala * (distancia([...punteros.current.values()]) / gesto.current.distancia));
  };
  const terminarToque = (evento) => {
    punteros.current.delete(evento.pointerId);
    if (punteros.current.size < 2) gesto.current = null;
  };

  return (
    <section className="overflow-hidden rounded-xl border border-cream-200 bg-cream-50/60" aria-label="Controles de visualización del horario">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 bg-white px-3 py-2.5 sm:px-4">
        <div>
          <p className="text-sm font-semibold text-primary-800">Vista del horario</p>
          <p className="text-xs text-primary-700/65">Desliza para recorrerlo o usa los controles para ampliar.</p>
        </div>
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="Zoom del horario">
          <button type="button" onClick={() => cambiarEscala(escala - PASO)} disabled={escala <= ESCALA_MINIMA} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cream-300 bg-white text-primary-800 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-45" aria-label="Reducir horario" title="Reducir"><HiMinus className="h-5 w-5" /></button>
          <button type="button" onClick={ajustarAPantalla} className="min-w-16 rounded-lg border border-gold-300 bg-gold-50 px-2.5 py-2 text-xs font-bold text-primary-800 transition hover:bg-gold-100" title="Ajustar el horario al ancho disponible">Ajustar</button>
          <button type="button" onClick={() => cambiarEscala(escala + PASO)} disabled={escala >= ESCALA_MAXIMA} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cream-300 bg-white text-primary-800 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-45" aria-label="Ampliar horario" title="Ampliar"><HiPlus className="h-5 w-5" /></button>
          <output className="ml-1 min-w-11 text-right text-xs font-bold tabular-nums text-primary-700" aria-live="polite">{Math.round(escala * 100)}%</output>
        </div>
      </div>
      <div ref={viewportRef} className="overflow-x-auto overscroll-x-contain p-2 sm:p-3" style={{ touchAction: 'pan-x pan-y' }} onPointerDown={iniciarToque} onPointerMove={moverToque} onPointerUp={terminarToque} onPointerCancel={terminarToque}>
        <div className="w-fit origin-top-left" style={{ zoom: escala }}>{children}</div>
      </div>
    </section>
  );
}

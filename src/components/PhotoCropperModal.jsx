import { useEffect, useMemo, useRef, useState } from 'react';

const FRAME_WIDTH = 354;
const FRAME_HEIGHT = 252;
const OUTPUT_WIDTH = 708;
const OUTPUT_HEIGHT = 504;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function PhotoCropperModal({ open, imageSrc, onCancel, onSave }) {
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setZoom(1); setPosition({ x: 0, y: 0 }); } }, [open, imageSrc]);

  const baseScale = Math.max(FRAME_WIDTH / natural.width, FRAME_HEIGHT / natural.height);
  const display = useMemo(() => ({ width: natural.width * baseScale * zoom, height: natural.height * baseScale * zoom }), [natural, baseScale, zoom]);
  const limits = {
    x: Math.abs(display.width - FRAME_WIDTH) / 2,
    y: Math.abs(display.height - FRAME_HEIGHT) / 2,
  };

  const updateZoom = (value) => {
    const next = Number(value);
    const nextWidth = natural.width * baseScale * next;
    const nextHeight = natural.height * baseScale * next;
    setZoom(next);
    const nextLimitX = Math.abs(nextWidth - FRAME_WIDTH) / 2;
    const nextLimitY = Math.abs(nextHeight - FRAME_HEIGHT) / 2;
    setPosition((current) => ({
      x: clamp(current.x, -nextLimitX, nextLimitX),
      y: clamp(current.y, -nextLimitY, nextLimitY),
    }));
  };

  const pointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: position };
  };
  const pointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition({ x: clamp(drag.origin.x + event.clientX - drag.x, -limits.x, limits.x), y: clamp(drag.origin.y + event.clientY - drag.y, -limits.y, limits.y) });
  };
  const pointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const save = async () => {
    if (!imageRef.current) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const context = canvas.getContext('2d');
      context.fillStyle = '#fffdfa';
      context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
      const scale = Math.max(OUTPUT_WIDTH / natural.width, OUTPUT_HEIGHT / natural.height) * zoom;
      const width = natural.width * scale;
      const height = natural.height * scale;
      const factor = OUTPUT_WIDTH / FRAME_WIDTH;
      context.drawImage(imageRef.current, (OUTPUT_WIDTH - width) / 2 + position.x * factor, (OUTPUT_HEIGHT - height) / 2 + position.y * factor, width, height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
      if (!blob) throw new Error('No se pudo generar el recorte');
      onSave(blob);
    } finally { setSaving(false); }
  };

  if (!open || !imageSrc) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
      <h3 className="font-display text-xl font-bold text-primary-800">Ajustar foto para el fotocheck</h3>
      <p className="mt-1 text-sm text-primary-700/70">Arrastre la imagen para centrar el rostro y use el control para reducirla o ampliarla.</p>
      <div className="mt-4 flex justify-center overflow-hidden">
        <div className="relative cursor-move touch-none overflow-hidden rounded-xl border-4 border-gold-400 bg-cream-100" style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
          <img ref={imageRef} src={imageSrc} crossOrigin="anonymous" alt="Encuadre del fotocheck" draggable="false" onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none" style={{ width: display.width, height: display.height, transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }} />
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/80" />
        </div>
      </div>
      <label className="mt-4 block text-sm font-semibold text-primary-800">Tamaño: {Math.round(zoom * 100)} %<input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="0.01" value={zoom} onChange={(event) => updateZoom(event.target.value)} className="mt-2 w-full accent-primary-700" /></label>
      <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-lg border border-cream-300 px-4 py-2 font-medium">Cancelar</button><button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Preparando...' : 'Guardar encuadre'}</button></div>
    </div>
  </div>;
}

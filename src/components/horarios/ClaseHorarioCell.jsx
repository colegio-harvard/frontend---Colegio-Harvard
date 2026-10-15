export default function ClaseHorarioCell({ clase, onOpen }) {
  if (!clase) return <span className="text-cream-400 text-sm">+ Agregar clase</span>;
  return <button className="w-full text-left rounded bg-primary-50 p-2" onClick={onOpen}><b>{clase.curso}</b><span className="block text-xs">{clase.docente}</span>{clase.espacio_fisico && <span className="block text-xs text-primary-700/70">{clase.espacio_fisico}</span>}</button>;
}

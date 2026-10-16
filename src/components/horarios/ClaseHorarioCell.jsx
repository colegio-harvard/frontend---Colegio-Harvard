import { colorTextoSecundario, estiloCursoHorario } from '../../utils/horarioColor';

export default function ClaseHorarioCell({ clase, onOpen }) {
  if (!clase) return <span className="text-cream-400 text-sm">+ Agregar clase</span>;
  return <button className="w-full text-left rounded bg-primary-50 p-2" style={estiloCursoHorario(clase.color_horario)} onClick={onOpen}><b>{clase.curso}</b><span className="block text-xs" style={{ color: colorTextoSecundario(clase.color_horario) }}>{clase.docente}</span>{clase.espacio_fisico && <span className="block text-xs" style={{ color: colorTextoSecundario(clase.color_horario) }}>{clase.espacio_fisico}</span>}</button>;
}

import { forwardRef } from 'react';
import insigniaOficial from '../../assets/insignia-harvard-oficial-2027.png';
import { colorTextoSecundario, estiloCursoHorario } from '../../utils/horarioColor';
import './HorarioImprimible.css';

const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const nombresDia = { LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves', VIERNES: 'Viernes' };
const hora = (valor) => String(valor || '').match(/(?:T|^)(\d{2}:\d{2})(?::\d{2})?/)?.[1] || '';
const rangoId = (bloque) => `${hora(bloque.hora_inicio)}-${hora(bloque.hora_fin)}`;

const HorarioEspacioImprimible = forwardRef(function HorarioEspacioImprimible({ data, className = '' }, ref) {
  if (!data) return null;
  const capacidad = Number(data.espacio?.capacidad_simultanea || 1);
  const rangos = [...new Map((data.bloques || []).map((bloque) => [rangoId(bloque), bloque])).values()];
  const ocupaciones = data.ocupaciones || [];

  return <section ref={ref} className={`horario-documento ${className}`} aria-label="Horario de uso del espacio físico">
    <header className="horario-documento__encabezado">
      <img className="horario-documento__insignia" src={insigniaOficial} alt="Insignia oficial del Colegio Harvard" />
      <div><p className="horario-documento__colegio">Colegio Harvard</p><h1>Horario de uso del espacio</h1><p className="horario-documento__persona">{data.espacio?.nombre}</p><p className="horario-documento__datos">Año escolar {data.anio?.anio} · Capacidad simultánea: {capacidad} {capacidad === 1 ? 'clase' : 'clases'}</p></div>
    </header>
    <div className="horario-documento__tabla-contenedor"><table className="horario-documento__tabla"><thead><tr><th>Hora</th>{dias.map((dia) => <th key={dia}>{nombresDia[dia]}</th>)}</tr></thead><tbody>
      {rangos.map((bloque) => <tr key={rangoId(bloque)}><td className="horario-documento__hora"><strong>{hora(bloque.hora_inicio)} – {hora(bloque.hora_fin)}</strong>{bloque.tipo !== 'CLASE' && bloque.nombre && <span>{bloque.nombre}</span>}</td>{dias.map((dia) => {
        const usos = ocupaciones.filter((uso) => uso.dia_semana === dia && rangoId(uso) === rangoId(bloque));
        const sobreocupado = usos.length > capacidad;
        if (!usos.length) return <td key={dia}><span className="horario-documento__libre">Libre</span></td>;
        return <td key={dia} className={sobreocupado ? 'bg-red-50' : ''}><div className="space-y-1">{usos.map((uso) => <article key={uso.id} className="horario-documento__clase" style={estiloCursoHorario(uso.color_horario)}><strong>{[uso.grado, uso.seccion].filter(Boolean).join(' ')}</strong><span>{uso.curso}</span><span style={{ color: colorTextoSecundario(uso.color_horario) }}>{uso.docente}</span></article>)}<small className={`block text-center font-semibold ${sobreocupado ? 'text-red-700' : usos.length === capacidad ? 'text-amber-700' : 'text-emerald-700'}`}>{sobreocupado ? `Sobreocupación: ${usos.length} de ${capacidad}` : `${usos.length} de ${capacidad}`}</small></div></td>;
      })}</tr>)}
    </tbody></table></div>
  </section>;
});

export default HorarioEspacioImprimible;

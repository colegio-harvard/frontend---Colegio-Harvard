import { forwardRef } from 'react';
import insigniaOficial from '../../assets/insignia-harvard-oficial-2027.png';
import { colorTextoSecundario, estiloCursoHorario } from '../../utils/horarioColor';
import './HorarioImprimible.css';

const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const nombreDia = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
};

const hora = (valor) => String(valor || '').match(/(?:T|^)(\d{2}:\d{2})(?::\d{2})?/)?.[1] || '';
const textoBloque = (bloque) => {
  const rango = `${hora(bloque.hora_inicio)} - ${hora(bloque.hora_fin)}`;
  const normalizar = (valor) => String(valor || '').trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  return normalizar(bloque.nombre) === normalizar(rango) ? '' : bloque.nombre;
};

function TarjetaClase({ clase, mostrarDocente = true }) {
  if (!clase) return <span className="horario-documento__vacio">—</span>;
  return (
    <div className="horario-documento__clase" style={estiloCursoHorario(clase.color_horario)}>
      <strong>{clase.curso || 'Curso'}</strong>
      {mostrarDocente && clase.docente && (
        <span style={{ color: colorTextoSecundario(clase.color_horario) }}>{clase.docente}</span>
      )}
      {clase.espacio_fisico && (
        <span style={{ color: colorTextoSecundario(clase.color_horario) }}>{clase.espacio_fisico}</span>
      )}
    </div>
  );
}

/**
 * Documento institucional reutilizable para impresión y exportaciones.
 * En modo agenda conserva la exactitud cuando un docente tiene niveles con
 * bloques distintos, sin inventar una cuadrícula institucional inexistente.
 */
const HorarioImprimible = forwardRef(function HorarioImprimible(
  {
    encabezado = {},
    bloques = [],
    clases = [],
    modo = 'cuadricula',
    mostrarDocente = true,
    className = '',
  },
  ref,
) {
  const tituloGrupo = [encabezado.nivel, encabezado.grado, encabezado.seccion]
    .filter(Boolean)
    .join(' ');

  return (
    <section ref={ref} className={`horario-documento ${className}`} aria-label="Horario institucional imprimible">
      <header className="horario-documento__encabezado">
        <img className="horario-documento__insignia" src={insigniaOficial} alt="Insignia oficial del Colegio Harvard" />
        <div>
          <p className="horario-documento__colegio">Colegio Harvard</p>
          <h1>Horario de clases</h1>
          {encabezado.persona && <p className="horario-documento__persona">{encabezado.persona}</p>}
          <p className="horario-documento__datos">
            {tituloGrupo || 'Horario institucional'}
            {encabezado.anio ? ` · Año escolar ${encabezado.anio}` : ''}
          </p>
        </div>
      </header>

      {modo === 'agenda' ? (
        <div className="horario-documento__agenda">
          {dias.map((dia) => {
            const clasesDia = clases
              .filter((clase) => clase.dia_semana === dia)
              .sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
            return (
              <section key={dia} className="horario-documento__dia-agenda">
                <h2>{nombreDia[dia]}</h2>
                {clasesDia.length ? clasesDia.map((clase, indice) => (
                  <article key={`${clase.id || indice}-${clase.hora_inicio}`} className="horario-documento__agenda-clase" style={estiloCursoHorario(clase.color_horario)}>
                    <b>{hora(clase.hora_inicio)} – {hora(clase.hora_fin)}</b>
                    <TarjetaClase clase={clase} mostrarDocente={false} />
                    <small>{[clase.nivel, clase.grado, clase.seccion].filter(Boolean).join(' · ')}</small>
                  </article>
                )) : <p className="horario-documento__libre">Libre</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="horario-documento__tabla-contenedor">
          <table className="horario-documento__tabla">
            <thead>
              <tr>
                <th>Hora</th>
                {dias.map((dia) => <th key={dia}>{nombreDia[dia]}</th>)}
              </tr>
            </thead>
            <tbody>
              {bloques.map((bloque) => (
                <tr key={bloque.id}>
                  <td className="horario-documento__hora">
                    <strong>{hora(bloque.hora_inicio)} – {hora(bloque.hora_fin)}</strong>
                    {textoBloque(bloque) && <span>{textoBloque(bloque)}</span>}
                  </td>
                  {dias.map((dia) => {
                    const clase = clases.find((item) => item.dia_semana === dia && Number(item.id_bloque_horario) === Number(bloque.id));
                    if (bloque.tipo === 'RECREO') return <td key={dia} className="horario-documento__recreo">RECREO</td>;
                    if (bloque.tipo === 'OTRO') return <td key={dia} className="horario-documento__institucional">{textoBloque(bloque) || bloque.nombre}</td>;
                    return <td key={dia}><TarjetaClase clase={clase} mostrarDocente={mostrarDocente} /></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});

export default HorarioImprimible;

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as horarios from '../services/horariosService';
import { listarAños } from '../services/configEscolarService';

const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const etiquetas = { LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves', VIERNES: 'Viernes' };
const hora = valor => String(valor || '').slice(0, 5);
const mensajeError = error => error.response?.data?.error || 'No se pudo completar la operación.';

export default function DisponibilidadDocente() {
  const [anios, setAnios] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [anio, setAnio] = useState('');
  const [docente, setDocente] = useState('');
  const [bloques, setBloques] = useState([]);
  const [restricciones, setRestricciones] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    Promise.all([listarAños(), horarios.listarDocentesDisponibilidad()])
      .then(([respuestaAnios, respuestaDocentes]) => {
        setAnios(respuestaAnios.data.data || []);
        setDocentes(respuestaDocentes.data.data || []);
      })
      .catch(error => toast.error(mensajeError(error)));
  }, []);

  const cargarMatriz = async () => {
    if (!anio || !docente) return;
    setCargando(true);
    try {
      const [respuestaBloques, respuestaDisponibilidad] = await Promise.all([
        horarios.listarBloques({ id_anio_escolar: anio }),
        horarios.obtenerDisponibilidad({ id_docente: docente, id_anio_escolar: anio }),
      ]);
      setBloques(respuestaBloques.data.data || []);
      setRestricciones(respuestaDisponibilidad.data.data || []);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarMatriz(); }, [anio, docente]);

  const alternar = async (bloque, dia) => {
    const datos = { id_docente: docente, id_anio_escolar: anio, id_bloque_horario: bloque.id, dia_semana: dia };
    const restriccion = restricciones.find(item => Number(item.id_bloque_horario) === Number(bloque.id) && item.dia_semana === dia);
    try {
      if (restriccion) {
        await horarios.restaurarDisponibilidad(datos);
        toast.success('El bloque vuelve a estar disponible.');
      } else {
        const respuesta = await horarios.guardarIndisponibilidad(datos);
        const conflictos = respuesta.data.conflictos || [];
        toast.success(conflictos.length ? 'Restricción guardada. Hay clases existentes que deben revisarse.' : 'Restricción guardada.');
      }
      await cargarMatriz();
    } catch (error) {
      toast.error(mensajeError(error));
    }
  };

  return <div className="space-y-6">
    <div>
      <h1 className="page-title">Disponibilidad docente</h1>
      <p className="page-subtitle">Los bloques sin restricción se consideran disponibles. Esta configuración no modifica horarios existentes.</p>
    </div>
    <section className="card space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block text-sm font-medium text-primary-800">Año escolar
          <select className="input-field mt-1" value={anio} onChange={event => setAnio(event.target.value)}>
            <option value="">Seleccione</option>
            {anios.map(item => <option key={item.id} value={item.id}>{item.anio}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-primary-800">Docente
          <select className="input-field mt-1" value={docente} onChange={event => setDocente(event.target.value)}>
            <option value="">Seleccione</option>
            {docentes.map(item => <option key={item.id} value={item.id}>{item.nombres}</option>)}
          </select>
        </label>
      </div>
      {anio && docente && <div className="overflow-x-auto">
        <p className="text-sm text-primary-700/65 mb-3">Pulse una celda para marcarla como no disponible o restaurarla. Los recreos no son configurables.</p>
        <table className="min-w-full text-sm">
          <thead><tr className="bg-cream-50 text-left"><th className="p-3">Bloque</th>{dias.map(dia => <th key={dia} className="p-3 text-center">{etiquetas[dia]}</th>)}</tr></thead>
          <tbody>{bloques.map(bloque => <tr key={bloque.id} className="border-b border-cream-100"><td className="p-3 whitespace-nowrap"><b>{hora(bloque.hora_inicio)} - {hora(bloque.hora_fin)}</b><span className="block text-xs text-primary-700/65">{bloque.nombre}</span></td>{dias.map(dia => {
            const noDisponible = restricciones.some(item => Number(item.id_bloque_horario) === Number(bloque.id) && item.dia_semana === dia && !item.disponible);
            return <td key={dia} className="p-2 text-center">{bloque.tipo === 'RECREO' ? <span className="text-xs text-amber-700">RECREO</span> : <button type="button" onClick={() => alternar(bloque, dia)} className={`rounded-md border px-3 py-2 text-xs font-semibold ${noDisponible ? 'border-red-300 bg-red-50 text-primary-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{noDisponible ? 'NO DISPONIBLE' : 'DISPONIBLE'}</button>}</td>;
          })}</tr>)}</tbody>
        </table>
        {cargando && <p className="p-3 text-sm text-primary-700">Cargando disponibilidad…</p>}
        {!cargando && !bloques.length && <p className="p-3 text-sm text-primary-700">No hay bloques configurados para este año escolar.</p>}
      </div>}
    </section>
  </div>;
}

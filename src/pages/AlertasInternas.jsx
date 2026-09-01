import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiBell, HiCheck, HiExclamation, HiPencil, HiPlus, HiSearch } from 'react-icons/hi';
import { guardarAlertaOperativaAlumno, listarAlertasOperativas, listarAlumnos, resolverAlertaOperativaAlumno } from '../services/alumnosService';
import { fileUrl } from '../utils/constants';

const normalizar = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const aulaDe = (alumno) => [alumno?.tbl_aulas?.tbl_grados?.tbl_niveles?.nombre, alumno?.tbl_aulas?.tbl_grados?.nombre, alumno?.tbl_aulas?.seccion].filter(Boolean).join(' · ');

export default function AlertasInternas() {
  const [alertas, setAlertas] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [estado, setEstado] = useState('ACTIVA');
  const [prioridad, setPrioridad] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [alumnoId, setAlumnoId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [prioridadForm, setPrioridadForm] = useState('URGENTE');
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [alertasR, alumnosR] = await Promise.all([listarAlertasOperativas({ estado, prioridad: prioridad || undefined }), listarAlumnos({ estado: 'ACTIVO' })]);
      setAlertas(alertasR.data.data || []);
      setAlumnos(alumnosR.data.data || []);
    } catch { toast.error('No se pudieron cargar las alertas internas'); }
    finally { setCargando(false); }
  }, [estado, prioridad]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return alertas;
    return alertas.filter(({ tbl_alumnos: alumno, mensaje: texto }) => normalizar(`${alumno?.codigo_alumno} ${alumno?.dni} ${alumno?.nombre_completo} ${aulaDe(alumno)} ${texto}`).includes(q));
  }, [alertas, busqueda]);

  const alumnosFiltrados = useMemo(() => {
    const q = normalizar(busquedaAlumno);
    if (!q) return alumnos.slice(0, 12);
    return alumnos.filter(a => normalizar(`${a.codigo_alumno} ${a.dni} ${a.nombre_completo}`).includes(q)).slice(0, 12);
  }, [alumnos, busquedaAlumno]);

  const alumnoSeleccionado = useMemo(() => alumnos.find(a => String(a.id) === alumnoId) || null, [alumnos, alumnoId]);
  const cambiarBusquedaAlumno = (value) => {
    setBusquedaAlumno(value);
    const q = normalizar(value).trim();
    const exacto = q ? alumnos.find(a => normalizar(a.codigo_alumno).trim() === q || normalizar(a.dni).trim() === q) : null;
    setAlumnoId(exacto ? String(exacto.id) : '');
  };

  const abrirNueva = () => { setEditando({ nueva: true }); setAlumnoId(''); setMensaje(''); setPrioridadForm('URGENTE'); setBusquedaAlumno(''); };
  const abrirEdicion = (alerta) => { setEditando(alerta); setAlumnoId(String(alerta.id_alumno)); setMensaje(alerta.mensaje); setPrioridadForm(alerta.prioridad); setBusquedaAlumno(`${alerta.tbl_alumnos?.codigo_alumno} · ${alerta.tbl_alumnos?.nombre_completo}`); };
  const cerrar = () => setEditando(null);

  const guardar = async () => {
    if (!alumnoId || !mensaje.trim()) return toast.error('Seleccione un alumno y escriba el mensaje');
    setGuardando(true);
    try {
      await guardarAlertaOperativaAlumno(alumnoId, { mensaje: mensaje.trim(), prioridad: prioridadForm });
      toast.success(editando?.estado === 'RESUELTA' ? 'Alerta reactivada' : 'Alerta guardada');
      cerrar(); await cargar();
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo guardar la alerta'); }
    finally { setGuardando(false); }
  };

  const resolver = async (alerta) => {
    if (!window.confirm(`¿Marcar como resuelta la alerta de ${alerta.tbl_alumnos?.nombre_completo}?`)) return;
    try { await resolverAlertaOperativaAlumno(alerta.id_alumno); toast.success('Alerta resuelta'); await cargar(); }
    catch { toast.error('No se pudo resolver la alerta'); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="page-title">Alertas internas</h1><p className="mt-1 text-sm text-primary-700/70">Seguimiento central de situaciones especiales vinculadas a los alumnos.</p></div><button onClick={abrirNueva} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"><HiPlus /> Nueva alerta</button></div>

    <section className="card p-5">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <label className="relative"><HiSearch className="absolute left-3 top-3.5 text-gold-600"/><input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="input-field pl-10" placeholder="Buscar por código, alumno, DNI, aula o mensaje" /></label>
        <select value={estado} onChange={e => setEstado(e.target.value)} className="input-field"><option value="ACTIVA">Activas</option><option value="RESUELTA">Resueltas</option><option value="TODAS">Todas</option></select>
        <select value={prioridad} onChange={e => setPrioridad(e.target.value)} className="input-field"><option value="">Toda prioridad</option><option value="URGENTE">Urgente</option><option value="IMPORTANTE">Importante</option></select>
      </div>
      <p className="mt-3 text-sm text-primary-700/60">Mostrando {filtradas.length} de {alertas.length} alertas</p>
    </section>

    <section className="card overflow-hidden">
      {cargando ? <p className="p-8 text-center text-primary-700/60">Cargando alertas...</p> : filtradas.length === 0 ? <div className="p-10 text-center"><HiBell className="mx-auto h-10 w-10 text-gold-400"/><p className="mt-2 font-semibold text-primary-800">No hay alertas con estos filtros</p></div> : <div className="divide-y divide-cream-200">{filtradas.map(alerta => {
        const alumno = alerta.tbl_alumnos;
        const activa = alerta.estado === 'ACTIVA';
        return <article key={alerta.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-gold-300 bg-cream-100">{alumno?.foto_url ? <img src={fileUrl(alumno.foto_url)} alt="" className="h-full w-full object-cover"/> : null}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-primary-900">{alumno?.nombre_completo}</h3><span className="text-sm font-medium text-primary-600">{alumno?.codigo_alumno}</span></div><p className="text-sm text-primary-700/65">{aulaDe(alumno) || 'Sin aula asignada'}</p><p className="mt-2 text-primary-800">{alerta.mensaje}</p></div></div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end"><span className={`rounded-full px-3 py-1 text-xs font-bold ${alerta.prioridad === 'URGENTE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}><HiExclamation className="mr-1 inline"/>{alerta.prioridad}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${activa ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{alerta.estado}</span><button onClick={() => abrirEdicion(alerta)} className="rounded-lg border border-cream-300 p-2 text-primary-700" title={activa ? 'Editar' : 'Reactivar'}><HiPencil/></button>{activa && <button onClick={() => resolver(alerta)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><HiCheck/> Resolver</button>}</div>
        </article>;
      })}</div>}
    </section>

    {editando && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><h2 className="font-display text-2xl font-bold text-primary-800">{editando.nueva ? 'Nueva alerta interna' : editando.estado === 'RESUELTA' ? 'Reactivar alerta' : 'Editar alerta'}</h2><div className="mt-5 space-y-4">
      <div><label className="mb-1 block text-sm font-semibold text-primary-800">Alumno</label>{editando.nueva ? <><input value={busquedaAlumno} onChange={e => cambiarBusquedaAlumno(e.target.value)} className="input-field" placeholder="Escriba código, DNI o nombre"/>{alumnoSeleccionado && <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><HiCheck className="h-5 w-5"/> Alumno seleccionado: {alumnoSeleccionado.codigo_alumno} · {alumnoSeleccionado.nombre_completo}</div>}<div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-cream-200">{alumnosFiltrados.map(a => <button key={a.id} type="button" onClick={() => { setAlumnoId(String(a.id)); setBusquedaAlumno(`${a.codigo_alumno} · ${a.nombre_completo}`); }} className={`block w-full border-b border-cream-100 px-3 py-2 text-left text-sm hover:bg-cream-50 ${String(a.id) === alumnoId ? 'bg-emerald-50 font-semibold text-emerald-800' : ''}`}>{a.codigo_alumno} · {a.nombre_completo}<span className="block text-xs text-primary-600">{aulaDe({ tbl_aulas: a.aula ? { seccion: a.aula.seccion, tbl_grados: { nombre: a.aula.grado?.nombre, tbl_niveles: { nombre: a.aula.grado?.nivel } } } : null })}</span></button>)}</div></> : <div className="rounded-lg bg-cream-50 p-3 font-semibold text-primary-800">{busquedaAlumno}</div>}</div>
      <div><label className="mb-1 block text-sm font-semibold text-primary-800">Mensaje operativo</label><textarea value={mensaje} onChange={e => setMensaje(e.target.value.slice(0, 250))} rows={4} className="input-field" placeholder="Ej.: FUM pendiente de entrega ¡Urgente!"/><p className="text-right text-xs text-primary-600">{mensaje.length}/250</p></div>
      <div><label className="mb-1 block text-sm font-semibold text-primary-800">Prioridad</label><select value={prioridadForm} onChange={e => setPrioridadForm(e.target.value)} className="input-field"><option value="URGENTE">Urgente</option><option value="IMPORTANTE">Importante</option></select></div>
    </div><div className="mt-6 flex justify-end gap-3"><button onClick={cerrar} className="rounded-lg border border-cream-300 px-4 py-2">Cancelar</button><button onClick={guardar} disabled={guardando || !alumnoId || !mensaje.trim()} className="btn-primary disabled:opacity-50">{guardando ? 'Guardando...' : editando.estado === 'RESUELTA' ? 'Reactivar alerta' : 'Guardar alerta'}</button></div></div></div>}
  </div>;
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiAcademicCap, HiCheckCircle, HiClock, HiLightBulb, HiLockClosed, HiUserGroup } from 'react-icons/hi';
import { listarAños, listarNiveles, listarGrados, listarAulas } from '../services/configEscolarService';
import { analizarGeneracion, generarHorarioAutomatico, listarHorarios } from '../services/horariosService';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const mensaje = error => error.response?.data?.error || 'No se pudo completar la generación.';

export default function GenerarHorario() {
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ anios: [], niveles: [], grados: [], aulas: [] });
  const [form, setForm] = useState({ id_anio_escolar: '', id_nivel: '', id_grado: '', id_aula: '' });
  const [analisis, setAnalisis] = useState(null);
  const [versiones, setVersiones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    Promise.all([listarAños(), listarNiveles(), listarGrados(), listarAulas()])
      .then(([a, n, g, au]) => setDatos({ anios: a.data.data || [], niveles: n.data.data || [], grados: g.data.data || [], aulas: au.data.data || [] }))
      .catch(error => toast.error(mensaje(error)));
  }, []);

  const grados = datos.grados.filter(item => !form.id_nivel || Number(item.id_nivel || item.nivel?.id) === Number(form.id_nivel));
  const aulas = datos.aulas.filter(item => !form.id_grado || Number(item.id_grado || item.grado?.id) === Number(form.id_grado));
  const seleccion = useMemo(() => ({
    anio: datos.anios.find(item => Number(item.id) === Number(form.id_anio_escolar))?.anio,
    nivel: datos.niveles.find(item => Number(item.id) === Number(form.id_nivel))?.nombre,
    grado: datos.grados.find(item => Number(item.id) === Number(form.id_grado))?.nombre,
    seccion: datos.aulas.find(item => Number(item.id) === Number(form.id_aula))?.seccion,
  }), [datos, form]);
  const publicado = versiones.find(item => item.estado === 'PUBLICADO');
  const borrador = versiones.find(item => item.estado === 'BORRADOR');

  const cambiarCampo = (campo, valor) => {
    setAnalisis(null); setVersiones([]);
    setForm({ ...form, [campo]: valor, ...(campo === 'id_nivel' ? { id_grado: '', id_aula: '' } : campo === 'id_grado' ? { id_aula: '' } : {}) });
  };

  const analizar = async event => {
    event.preventDefault(); setCargando(true);
    try {
      const [respuestaAnalisis, respuestaVersiones] = await Promise.all([
        analizarGeneracion({ id_anio_escolar: form.id_anio_escolar, id_aula: form.id_aula }),
        listarHorarios({ id_anio_escolar: form.id_anio_escolar, id_aula: form.id_aula }),
      ]);
      setAnalisis(respuestaAnalisis.data); setVersiones(respuestaVersiones.data.data || []);
    } catch (error) { toast.error(mensaje(error)); } finally { setCargando(false); }
  };

  const generar = async () => {
    setCargando(true);
    try {
      const respuesta = await generarHorarioAutomatico({ id_anio_escolar: form.id_anio_escolar, id_aula: form.id_aula });
      toast.success('Horario generado automáticamente. Revíselo antes de validar y publicar.');
      navegar(`/horarios?horario=${respuesta.data.data.id}`);
    } catch (error) {
      const errores = error.response?.data?.errores || [];
      toast.error(errores[0] || mensaje(error));
    } finally { setCargando(false); }
  };

  return <div className="space-y-6">
    <header>
      <h1 className="page-title">Generación automática de horarios</h1>
      <p className="page-subtitle max-w-4xl">Esta herramienta crea automáticamente una propuesta usando la carga semanal, los bloques horarios, la disponibilidad docente y la configuración institucional.</p>
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><b>Siempre seguro:</b> la propuesta nunca se publica automáticamente. Se crea en estado <b>BORRADOR</b> para revisarla, corregirla y validarla desde Horarios.</p>
    </header>

    <form className="card-harvard p-5" onSubmit={analizar}>
      <div className="mb-5 flex items-center gap-3"><Paso numero="1" /><div><h2 className="font-display text-xl font-bold text-primary-900">Analizar y preparar propuesta</h2><p className="text-sm text-cream-600">Seleccione la sección antes de crear cualquier propuesta.</p></div></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[['id_anio_escolar', 'Año escolar', datos.anios, 'anio'], ['id_nivel', 'Nivel', datos.niveles, 'nombre'], ['id_grado', 'Grado', grados, 'nombre'], ['id_aula', 'Sección', aulas, 'seccion']].map(([campo, etiqueta, items, nombre]) => <label key={campo} className="text-sm font-semibold text-primary-800">{etiqueta}<select required className="input-field mt-1" value={form[campo]} onChange={event => cambiarCampo(campo, event.target.value)}><option value="">Seleccione</option>{items.map(item => <option key={item.id} value={item.id}>{item[nombre]}</option>)}</select></label>)}
      </div>
      <div className="mt-5"><button disabled={cargando} className="btn-primary inline-flex items-center gap-2"><HiLightBulb />{cargando ? 'Analizando…' : 'Analizar y preparar propuesta'}</button><p className="mt-2 text-xs text-cream-600">Este paso no crea ni modifica horarios.</p></div>
    </form>

    {analisis && <section className="card-harvard space-y-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Paso numero="2" /><div><h2 className="font-display text-xl font-bold text-primary-900">Resultado del análisis</h2><p className="text-sm text-cream-600">{[seleccion.nivel, seleccion.grado, seleccion.seccion, seleccion.anio].filter(Boolean).join(' · ')}</p></div></div><Estado posible={analisis.posible} /></div>
      {publicado && <Aviso titulo="Esta sección ya tiene un horario publicado.">La nueva generación creará una versión BORRADOR y no reemplazará ni modificará el horario publicado actual.</Aviso>}
      {borrador && <Aviso titulo="Ya existe un borrador para esta sección.">La generación creará otra versión BORRADOR; el borrador existente no se sobrescribirá.</Aviso>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metrica icon={<HiAcademicCap />} etiqueta="Asignaciones" valor={analisis.asignaciones || 0} detalle={`${analisis.cargasConfiguradas || 0} con carga configurada`} estado={analisis.asignaciones && analisis.asignaciones === analisis.cargasConfiguradas ? 'ok' : 'warn'} />
        <Metrica icon={<HiClock />} etiqueta="Bloques" valor={`${analisis.bloquesRequeridos || 0} / ${analisis.bloquesDisponibles || 0}`} detalle="Requeridos / disponibles" estado={(analisis.bloquesRequeridos || 0) <= (analisis.bloquesDisponibles || 0) ? 'ok' : 'bad'} />
        <Metrica icon={<HiUserGroup />} etiqueta="Docentes involucrados" valor={analisis.docentesInvolucrados || 0} detalle={`${analisis.restriccionesDisponibilidad || 0} restricción(es) registrada(s)`} estado={analisis.restriccionesRespetadas ? 'ok' : 'warn'} />
        <Metrica icon={<HiCheckCircle />} etiqueta="Conflictos detectados" valor={analisis.errores?.length || 0} detalle={analisis.errores?.length ? 'Requieren revisión antes de generar' : 'No se detectan bloqueos'} estado={analisis.errores?.length ? 'bad' : 'ok'} />
        <Metrica icon={<HiLockClosed />} etiqueta="Espacios físicos" valor="Revisión" detalle={analisis.espaciosFisicos || 'Sin asignación automática'} estado="warn" />
      </div>
      <div className={`rounded-xl border p-4 ${analisis.posible ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}><b>{analisis.posible ? 'Listo para generar una propuesta.' : 'Bloqueado: aún no es posible generar la propuesta.'}</b><p className="mt-1 text-sm">{analisis.posible ? 'Todas las cargas están configuradas, hay bloques suficientes y el análisis no detectó conflictos críticos.' : 'Revise los puntos indicados y vuelva a analizar antes de intentar generar.'}</p></div>
      {!!analisis.errores?.length && <ul className="list-disc space-y-1 rounded-xl border border-red-100 bg-red-50 px-8 py-4 text-sm text-red-900">{analisis.errores.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      {analisis.posible && <div className="flex flex-wrap items-center gap-3 border-t border-cream-200 pt-5"><button type="button" className="btn-secondary" onClick={() => setAnalisis(null)}>Cancelar</button><button disabled={cargando} type="button" className="btn-primary" onClick={() => setConfirmar(true)}>{cargando ? 'Generando…' : 'Generar horario en borrador'}</button><span className="text-xs text-cream-600">No valida ni publica automáticamente.</span></div>}
    </section>}
    <ConfirmDialog isOpen={confirmar} onClose={() => setConfirmar(false)} onConfirm={generar} title="Generar horario en borrador" message="Se creará una nueva propuesta en estado BORRADOR. Podrás revisarla y modificarla desde Horarios antes de validar o publicar." confirmText="Generar borrador" variant="danger" />
  </div>;
}

function Paso({ numero }) { return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-700 font-bold text-white">{numero}</span>; }
function Estado({ posible }) { return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${posible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{posible ? 'Listo' : 'Bloqueado'}</span>; }
function Aviso({ titulo, children }) { return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>{titulo}</b><p className="mt-1">{children}</p></div>; }
function Metrica({ icon, etiqueta, valor, detalle, estado }) { const tonos = { ok: 'bg-emerald-50 text-emerald-700', warn: 'bg-amber-50 text-amber-700', bad: 'bg-red-50 text-red-700' }; return <div className="rounded-xl border border-cream-200 bg-white p-4"><div className="flex items-center gap-2"><span className={`rounded-lg p-2 ${tonos[estado]}`}>{icon}</span><p className="text-xs font-semibold uppercase tracking-wide text-cream-600">{etiqueta}</p></div><p className="mt-3 text-xl font-bold text-primary-900">{valor}</p><p className="mt-1 text-xs text-cream-600">{detalle}</p></div>; }

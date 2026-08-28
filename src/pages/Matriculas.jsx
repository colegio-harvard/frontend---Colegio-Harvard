import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCheckCircle, HiClipboardList, HiCog, HiExternalLink, HiEye, HiMail, HiPrinter, HiRefresh, HiSearch, HiX } from 'react-icons/hi';
import Card from '../components/ui/Card';
import { cargarMatriculas, generarInvitacionMatricula, guardarConfiguracionMatricula, obtenerExpedienteMatricula, revisarMatricula } from '../services/matriculasService';

const money = (value) => `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
const labels = { BORRADOR: 'Borrador', ENVIADA: 'Invitación enviada', ABIERTA: 'Abierta por el padre', ACEPTADA: 'Aceptada', OBSERVADA: 'Observada', COMPLETADA: 'Completada' };
const badge = { ENVIADA: 'bg-blue-100 text-blue-700', ABIERTA: 'bg-amber-100 text-amber-700', ACEPTADA: 'bg-emerald-100 text-emerald-700', OBSERVADA: 'bg-rose-100 text-rose-700', COMPLETADA: 'bg-primary-100 text-primary-800' };

const field = 'w-full rounded-lg border border-cream-300 px-3 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-100';
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

export default function Matriculas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState(null);
  const [detail, setDetail] = useState(null);
  const [observation, setObservation] = useState('');

  const load = async () => {
    setLoading(true);
    try { const response = await cargarMatriculas(); setData(response.data.data); }
    catch (error) { toast.error(error.response?.data?.error || 'No se pudo cargar Matrícula Digital'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const students = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('es');
    const rows = data?.alumnos || [];
    if (!text) return rows;
    return rows.filter((x) => [x.codigo_alumno, x.nombre_completo, x.apoderado, x.dni, x.dni_apoderado].some((v) => String(v || '').toLocaleLowerCase('es').includes(text)));
  }, [data, query]);
  const stats = useMemo(() => (data?.alumnos || []).reduce((acc, x) => { const key = x.estado_matricula || 'SIN_INICIAR'; acc[key] = (acc[key] || 0) + 1; return acc; }, {}), [data]);

  const saveConfig = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      await guardarConfiguracionMatricula({ fecha_inicio: form.get('fecha_inicio') || null, fecha_fin: form.get('fecha_fin') || null, nombre_documentos: form.get('nombre_documentos'), enlace_documentos: form.get('enlace_documentos'), version_documentos: form.get('version_documentos'), activo: form.get('activo') === 'on', documentos_json: data.config.documentos_json });
      toast.success('Campaña guardada'); setShowConfig(false); await load();
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo guardar'); }
    finally { setSaving(false); }
  };

  const createInvite = async (student) => {
    try {
      const response = await generarInvitacionMatricula(student.id);
      setInvite({ ...response.data.data, student: student.nombre_completo });
      await load();
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo preparar la invitación'); }
  };
  const openWhatsApp = () => {
    const phone = `51${String(invite.telefono || '').replace(/\D/g, '').replace(/^51/, '')}`;
    window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(invite.mensaje)}`;
  };
  const openDetail = async (id) => {
    try { const response = await obtenerExpedienteMatricula(id); setDetail(response.data.data); setObservation(response.data.data.observacion_revision || ''); }
    catch (error) { toast.error(error.response?.data?.error || 'No se pudo abrir el expediente'); }
  };
  const review = async (status) => {
    try { await revisarMatricula(detail.id, { estado: status, observacion: observation }); toast.success(status === 'COMPLETADA' ? 'Matrícula completada' : 'Observación registrada'); setDetail(null); await load(); }
    catch (error) { toast.error(error.response?.data?.error || 'No se pudo revisar'); }
  };

  if (loading) return <div className="p-8 text-primary-700">Cargando Matrícula Digital...</div>;
  if (!data) return <div className="p-8">No fue posible cargar el módulo.</div>;
  const config = data.config || {};

  return <div className="space-y-6 pb-10">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-display text-3xl text-primary-800">Matrícula Digital</h1><p className="mt-1 text-primary-500">Campaña {data.anio.anio}: invitaciones, aceptaciones y evidencia en un solo lugar.</p></div>
      <div className="flex gap-2"><button onClick={load} className={`${btn} border border-cream-300 bg-white text-primary-700`}><HiRefresh />Actualizar</button><button onClick={() => setShowConfig(!showConfig)} className={`${btn} bg-gold-500 text-white`}><HiCog />Configurar campaña</button></div>
    </div>

    {showConfig && <Card title={`Configuración ${data.anio.anio}`}>
      <form onSubmit={saveConfig} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-primary-700">Inicio<input name="fecha_inicio" type="date" defaultValue={String(config.fecha_inicio || '').slice(0, 10)} className={`${field} mt-1`} /><small className="mt-1 block text-primary-400">Primer día desde el que se admitirán aceptaciones de matrícula.</small></label>
        <label className="text-sm text-primary-700">Cierre<input name="fecha_fin" type="date" defaultValue={String(config.fecha_fin || '').slice(0, 10)} className={`${field} mt-1`} /><small className="mt-1 block text-primary-400">Último día previsto de la campaña; sirve para organización y seguimiento.</small></label>
        <label className="text-sm text-primary-700">Nombre del paquete documental<input name="nombre_documentos" defaultValue={config.nombre_documentos || 'Documentos oficiales de matrícula'} className={`${field} mt-1`} /><small className="mt-1 block text-primary-400">Título común del conjunto de documentos que recibirá el padre.</small></label>
        <label className="text-sm text-primary-700">Versión de documentos<input name="version_documentos" defaultValue={config.version_documentos || '1.0'} className={`${field} mt-1`} /><small className="mt-1 block text-primary-400">Identifica exactamente qué edición aceptó el padre.</small></label>
        <label className="text-sm text-primary-700 md:col-span-2">Enlace anual de Google Drive<input name="enlace_documentos" type="url" placeholder="https://drive.google.com/..." defaultValue={config.enlace_documentos || ''} className={`${field} mt-1`} /><small className="mt-1 block text-primary-400">Carpeta en modo solo lectura con todos los documentos oficiales del año.</small></label>
        <div className="md:col-span-2 rounded-lg bg-cream-50 p-4 text-sm text-primary-700"><p className="font-semibold">Documentos que el padre aceptará por separado</p><ul className="mt-2 grid gap-1 md:grid-cols-2">{config.documentos_json.map((d) => <li key={d.clave}>• {d.nombre}{d.obligatorio === false ? ' (opcional)' : ''}</li>)}</ul></div>
        <label className="flex items-center gap-2 text-sm"><input name="activo" type="checkbox" defaultChecked={config.activo !== false} /> Campaña habilitada</label>
        <div className="flex justify-end md:col-span-2"><button disabled={saving} className={`${btn} bg-primary-700 text-white`}>{saving ? 'Guardando...' : 'Guardar configuración'}</button></div>
      </form>
    </Card>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[['Alumnos activos', data.alumnos.length], ['Sin iniciar', stats.SIN_INICIAR || 0], ['Invitaciones abiertas', (stats.ENVIADA || 0) + (stats.ABIERTA || 0)], ['Aceptadas', stats.ACEPTADA || 0], ['Completadas', stats.COMPLETADA || 0]].map(([name, value]) => <Card key={name} className="!shadow-sm"><p className="text-sm text-primary-500">{name}</p><p className="mt-1 text-2xl font-bold text-primary-800">{value}</p></Card>)}
    </div>

    <Card title="Estudiantes y expedientes" actions={<span className="text-sm text-primary-500">{students.length} de {data.alumnos.length}</span>}>
      <div className="relative mb-5"><HiSearch className="absolute left-3 top-3.5 text-gold-600"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, alumno, DNI o apoderado" className={`${field} pl-10`} /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-primary-800 text-white"><tr><th className="p-3">Alumno</th><th className="p-3">Apoderado</th><th className="p-3">Aula</th><th className="p-3">Deuda actual</th><th className="p-3">Estado</th><th className="p-3 text-right">Acción</th></tr></thead><tbody>
        {students.map((x) => { const cerrada = ['ACEPTADA', 'COMPLETADA'].includes(x.estado_matricula); return <tr key={x.id} className="border-b border-cream-200 hover:bg-cream-50"><td className="p-3"><b>{x.nombre_completo}</b><div className="text-xs text-primary-500">{x.codigo_alumno} · DNI {x.dni || 'no registrado'}</div></td><td className="p-3">{x.apoderado || <span className="text-rose-600">Sin apoderado</span>}<div className="text-xs text-primary-500">{x.celular || ''}</div></td><td className="p-3">{x.grado} {x.seccion}<div className="text-xs text-primary-500">{x.nivel}</div></td><td className="p-3 font-semibold">{money(x.deuda_actual)}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge[x.estado_matricula] || 'bg-gray-100 text-gray-600'}`}>{labels[x.estado_matricula] || 'Sin iniciar'}</span></td><td className="p-3 text-right">{x.id_matricula && <button onClick={() => openDetail(x.id_matricula)} className={`${btn} mr-2 border border-cream-300 bg-white py-2 text-primary-700`}><HiEye />Ver</button>}{!cerrada && <button onClick={() => createInvite(x)} disabled={!x.id_padre || !config.id} className={`${btn} bg-primary-700 py-2 text-white`}><HiMail />{x.id_matricula ? 'Reenviar' : 'Invitar'}</button>}</td></tr>; })}
      </tbody></table></div>
      {!students.length && <p className="py-10 text-center text-primary-400">No hay coincidencias.</p>}
    </Card>

    {invite && <div className="fixed inset-0 z-[70] grid place-items-center bg-primary-950/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><div><h2 className="font-display text-2xl text-primary-800">Invitación preparada</h2><p className="text-sm text-primary-500">{invite.student} · {invite.codigo}</p></div><button onClick={() => setInvite(null)}><HiX className="h-6 w-6"/></button></div><div className="mt-5 whitespace-pre-wrap rounded-xl bg-cream-50 p-4 text-sm text-primary-800">{invite.mensaje}</div><p className="mt-3 text-xs text-primary-500">El código solo se muestra aquí y vence en 24 horas. El enlace vence en 7 días.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={() => navigator.clipboard.writeText(invite.mensaje)} className={`${btn} border border-cream-300`}>Copiar mensaje</button><button onClick={openWhatsApp} className={`${btn} bg-emerald-600 text-white`}>Abrir WhatsApp</button></div></div></div>}

    {detail && <div className="fixed inset-0 z-[70] overflow-y-auto bg-primary-950/50 p-4"><div className="mx-auto my-6 max-w-4xl rounded-2xl bg-white p-6 shadow-2xl print:my-0 print:shadow-none"><div className="flex justify-between"><div><h2 className="font-display text-2xl text-primary-800">Expediente {detail.codigo}</h2><p className="text-sm text-primary-500">{detail.datos_snapshot?.alumno?.nombre} · {detail.estado}</p></div><button className="print:hidden" onClick={() => setDetail(null)}><HiX className="h-6 w-6"/></button></div><div className="mt-5 grid gap-4 md:grid-cols-3">{[['Apoderado', detail.datos_snapshot?.apoderado?.nombre], ['Aceptado', detail.aceptado_en ? new Date(detail.aceptado_en).toLocaleString('es-PE') : 'Pendiente'], ['Resumen financiero', `${money(detail.deuda_snapshot)} + matrícula ${money(detail.costo_matricula_snapshot)}`]].map(([a,b]) => <div key={a} className="rounded-xl bg-cream-50 p-4"><p className="text-xs uppercase text-primary-500">{a}</p><p className="mt-1 font-semibold">{b}</p></div>)}</div><h3 className="mt-6 font-semibold text-primary-800">Personas autorizadas en una emergencia</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{[detail.datos_formulario?.persona_autorizada_1, detail.datos_formulario?.persona_autorizada_2].filter((p) => p?.nombre).map((p, i) => <div key={i} className="rounded-lg border p-3 text-sm"><b>{p.nombre}</b><p>DNI: {p.dni} · {p.parentesco}</p><p>Celular: {p.celular}</p></div>)}</div><h3 className="mt-6 font-semibold text-primary-800">Aceptaciones</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{detail.documentos_snapshot.map((d) => <div key={d.clave} className="flex items-center gap-2 rounded-lg border p-3"><HiCheckCircle className={detail.aceptaciones_json?.[d.clave] ? 'text-emerald-600' : 'text-gray-300'} />{d.nombre} · versión {d.version}</div>)}</div><h3 className="mt-6 font-semibold text-primary-800">Trazabilidad</h3><div className="mt-2 space-y-2">{detail.eventos.map((e) => <div key={e.id} className="flex justify-between rounded-lg bg-cream-50 p-3 text-sm"><span>{String(e.evento).replaceAll('_',' ')}</span><span className="text-primary-500">{new Date(e.creado_en).toLocaleString('es-PE')}</span></div>)}</div>{detail.hash_evidencia && <p className="mt-5 break-all rounded-lg border border-dashed border-gold-400 p-3 font-mono text-xs">Huella de evidencia SHA-256: {detail.hash_evidencia}</p>}<div className="mt-6 print:hidden"><textarea value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Observación de revisión" className={field}/><div className="mt-3 flex flex-wrap justify-end gap-2"><button onClick={() => window.print()} className={`${btn} border`}><HiPrinter/>Imprimir evidencia</button><button onClick={() => review('OBSERVADA')} disabled={!detail.aceptado_en || !observation.trim()} className={`${btn} bg-amber-500 text-white`}>Observar</button><button onClick={() => review('COMPLETADA')} disabled={!detail.aceptado_en} className={`${btn} bg-emerald-600 text-white`}>Completar matrícula</button></div></div></div></div>}
  </div>;
}


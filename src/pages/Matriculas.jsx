import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCheckCircle, HiCog, HiEye, HiMail, HiPlus, HiPrinter, HiRefresh, HiSearch, HiUserAdd, HiX } from 'react-icons/hi';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { cargarMatriculas, generarInvitacionMatricula, guardarConfiguracionMatricula, guardarControlDocumentalMatricula, obtenerExpedienteMatricula, revisarMatricula } from '../services/matriculasService';
import { crearAlumno, obtenerSiguienteCodigoAlumno } from '../services/alumnosService';
import { listarAulas, listarNiveles } from '../services/configEscolarService';
import { buscarPadres } from '../services/padresService';

const money = (value) => `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
const labels = { BORRADOR: 'Borrador', ENVIADA: 'Invitación enviada', ABIERTA: 'Abierta por el padre', ACEPTADA: 'Aceptada', OBSERVADA: 'Observada', COMPLETADA: 'Completada' };
const statusFilters = [
  { key: 'TODOS', label: 'Todos', matches: () => true },
  { key: 'SIN_INICIAR', label: 'Por invitar / Sin iniciar', matches: (status) => !status || status === 'SIN_INICIAR' || status === 'BORRADOR' },
  { key: 'INVITACION', label: 'Invitación enviada o abierta', matches: (status) => ['ENVIADA', 'ABIERTA'].includes(status) },
  { key: 'ACEPTADA', label: 'Aceptada', matches: (status) => status === 'ACEPTADA' },
  { key: 'COMPLETADA', label: 'Completada', matches: (status) => status === 'COMPLETADA' },
  { key: 'OBSERVADA', label: 'Observada', matches: (status) => status === 'OBSERVADA' },
];
const badge = { ENVIADA: 'bg-blue-100 text-blue-700', ABIERTA: 'bg-amber-100 text-amber-700', ACEPTADA: 'bg-emerald-100 text-emerald-700', OBSERVADA: 'bg-rose-100 text-rose-700', COMPLETADA: 'bg-primary-100 text-primary-800' };
const expedienteAction = (status) => {
  if (status === 'ACEPTADA') return { label: 'Revisar y completar', classes: 'border-emerald-600 bg-emerald-600 text-white' };
  if (status === 'OBSERVADA') return { label: 'Revisar observación', classes: 'border-rose-300 bg-rose-50 text-rose-700' };
  if (status === 'COMPLETADA') return { label: 'Ver expediente', classes: 'border-cream-300 bg-white text-primary-700' };
  return { label: 'Ver seguimiento', classes: 'border-cream-300 bg-white text-primary-700' };
};

const field = 'w-full rounded-lg border border-cream-300 px-3 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-100';
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const documentosControl = [
  ['certificado_estudios', 'Certificado de estudios del colegio de origen'],
  ['ficha_unica_matricula', 'Ficha única de matrícula'],
  ['libreta_anterior', 'Libreta del año anterior'],
  ['dni_alumno', 'Copia del DNI del alumno'],
  ['dni_apoderado', 'Copia del DNI del apoderado'],
  ['foto_alumno', 'Foto tamaño carné del alumno'],
  ['foto_apoderado', 'Foto tamaño carné del apoderado'],
];

export default function Matriculas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState(null);
  const [detail, setDetail] = useState(null);
  const [observation, setObservation] = useState('');
  const [documentCheck, setDocumentCheck] = useState({});
  const [documentSaving, setDocumentSaving] = useState(false);
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const [studentSaving, setStudentSaving] = useState(false);
  const [aulas, setAulas] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [studentForm, setStudentForm] = useState({ codigo_alumno: '', dni: '', nombre_completo: '', monto_matricula: '', monto_materiales: '', monto_pension: '', id_nivel: '', id_grado: '', id_aula: '' });
  const [parentMode, setParentMode] = useState('existing');
  const [parentQuery, setParentQuery] = useState('');
  const [parentResults, setParentResults] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [parentForm, setParentForm] = useState({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });

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
    const selectedFilter = statusFilters.find((filter) => filter.key === statusFilter) || statusFilters[0];
    return rows.filter((x) => selectedFilter.matches(x.estado_matricula) && (!text || [x.codigo_alumno, x.nombre_completo, x.apoderado, x.dni, x.dni_apoderado].some((v) => String(v || '').toLocaleLowerCase('es').includes(text))));
  }, [data, query, statusFilter]);
  const stats = useMemo(() => (data?.alumnos || []).reduce((acc, x) => { const key = x.estado_matricula || 'SIN_INICIAR'; acc[key] = (acc[key] || 0) + 1; return acc; }, {}), [data]);
  const grades = useMemo(() => niveles.find((n) => n.id === Number(studentForm.id_nivel))?.grados?.filter((g) => aulas.some((a) => a.id_grado === g.id)) || [], [niveles, aulas, studentForm.id_nivel]);
  const classrooms = useMemo(() => aulas.filter((a) => a.id_grado === Number(studentForm.id_grado)), [aulas, studentForm.id_grado]);

  const openNewStudent = async () => {
    try {
      const [codeResponse, aulasResponse, nivelesResponse] = await Promise.all([obtenerSiguienteCodigoAlumno(), listarAulas(), listarNiveles()]);
      const codigo = codeResponse.data?.data?.codigo_alumno || codeResponse.data?.codigo_alumno || '';
      setAulas(aulasResponse.data.data || []); setNiveles(nivelesResponse.data.data || []);
      setStudentForm({ codigo_alumno: codigo, dni: '', nombre_completo: '', monto_matricula: '', monto_materiales: '', monto_pension: '', id_nivel: '', id_grado: '', id_aula: '' });
      setParentMode('existing'); setParentQuery(''); setParentResults([]); setSelectedParent(null);
      setParentForm({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });
      setNewStudentOpen(true);
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo preparar el registro del alumno'); }
  };
  const searchParent = async () => {
    if (parentQuery.trim().length < 2) return toast.error('Escriba por lo menos 2 caracteres');
    try { const response = await buscarPadres(parentQuery.trim()); setParentResults(response.data.data || []); }
    catch { toast.error('No se pudo buscar al apoderado'); }
  };
  const saveNewStudent = async (event) => {
    event.preventDefault();
    if (parentMode === 'existing' && !selectedParent) return toast.error('Seleccione un apoderado existente');
    setStudentSaving(true);
    try {
      const fd = new FormData();
      ['codigo_alumno','dni','nombre_completo','monto_matricula','monto_materiales','monto_pension','id_aula'].forEach((key) => { if (studentForm[key] !== '') fd.append(key, studentForm[key]); });
      if (parentMode === 'existing') fd.append('padre_dni', selectedParent.dni);
      else {
        fd.append('padre_dni', parentForm.dni); fd.append('padre_nombre', parentForm.nombre_completo); fd.append('padre_celular', parentForm.celular);
        fd.append('padre_username', parentForm.username); fd.append('padre_contrasena', parentForm.contrasena);
      }
      await crearAlumno(fd); toast.success('Alumno creado y listo para matrícula digital'); setNewStudentOpen(false); await load();
      setQuery(studentForm.codigo_alumno);
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo crear el alumno'); }
    finally { setStudentSaving(false); }
  };

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
    try { const response = await obtenerExpedienteMatricula(id); const expediente = response.data.data; const traslado = expediente.datos_formulario?.tipo_ingreso === 'TRASLADO'; const defaults = Object.fromEntries(documentosControl.map(([key]) => [key, { estado: ['certificado_estudios', 'libreta_anterior'].includes(key) && !traslado ? 'NO_APLICA' : 'PENDIENTE', observacion: '' }])); setDetail(expediente); setDocumentCheck({ ...defaults, ...(expediente.control_documental || {}) }); setObservation(expediente.observacion_revision || ''); }
    catch (error) { toast.error(error.response?.data?.error || 'No se pudo abrir el expediente'); }
  };
  const saveDocumentCheck = async () => {
    setDocumentSaving(true);
    try { const response = await guardarControlDocumentalMatricula(detail.id, documentCheck); const control = response.data.data.control_documental; setDocumentCheck(control); setDetail({ ...detail, control_documental: control }); toast.success('Control de entrega guardado'); }
    catch (error) { toast.error(error.response?.data?.error || 'No se pudo guardar el control documental'); }
    finally { setDocumentSaving(false); }
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
      <div className="flex flex-wrap gap-2"><button onClick={openNewStudent} className={`${btn} bg-primary-700 text-white`}><HiPlus />Nuevo alumno</button><button onClick={load} className={`${btn} border border-cream-300 bg-white text-primary-700`}><HiRefresh />Actualizar</button><button onClick={() => setShowConfig(!showConfig)} className={`${btn} bg-gold-500 text-white`}><HiCog />Configurar campaña</button></div>
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
      {[['Alumnos activos', data.alumnos.length, 'TODOS'], ['Sin iniciar', (stats.SIN_INICIAR || 0) + (stats.BORRADOR || 0), 'SIN_INICIAR'], ['Invitaciones abiertas', (stats.ENVIADA || 0) + (stats.ABIERTA || 0), 'INVITACION'], ['Aceptadas', stats.ACEPTADA || 0, 'ACEPTADA'], ['Completadas', stats.COMPLETADA || 0, 'COMPLETADA']].map(([name, value, filter]) => <Card key={name} role="button" tabIndex={0} onClick={() => setStatusFilter(filter)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setStatusFilter(filter); }} className={`cursor-pointer !shadow-sm ${statusFilter === filter ? '!border-gold-500 ring-2 ring-gold-200' : ''}`}><p className="text-sm text-primary-500">{name}</p><p className="mt-1 text-2xl font-bold text-primary-800">{value}</p></Card>)}
    </div>

    <Card title="Estudiantes y expedientes" actions={<span className="text-sm text-primary-500">{students.length} de {data.alumnos.length}</span>}>
      <div className="mb-4" aria-label="Filtrar matrículas por estado">
        <p className="mb-2 text-sm font-semibold text-primary-700">Filtrar por estado</p>
        <div className="flex flex-wrap gap-2">{statusFilters.map((filter) => <button key={filter.key} type="button" aria-pressed={statusFilter === filter.key} onClick={() => setStatusFilter(filter.key)} className={`${btn} border px-3 py-2 text-sm ${statusFilter === filter.key ? 'border-primary-700 bg-primary-700 text-white shadow-sm' : 'border-cream-300 bg-white text-primary-700 hover:border-gold-500'}`}>{filter.label}{filter.key === 'OBSERVADA' && stats.OBSERVADA ? ` (${stats.OBSERVADA})` : ''}</button>)}</div>
        <p className="mt-2 text-xs text-primary-500">Filtro activo: <b>{statusFilters.find((filter) => filter.key === statusFilter)?.label}</b></p>
      </div>
      <div className="relative mb-5"><HiSearch className="absolute left-3 top-3.5 text-gold-600"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, alumno, DNI o apoderado" className={`${field} pl-10`} /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-primary-800 text-white"><tr><th className="p-3">Alumno</th><th className="p-3">Apoderado</th><th className="p-3">Aula</th><th className="p-3">Deuda actual</th><th className="p-3">Estado</th><th className="p-3 text-right">Acción</th></tr></thead><tbody>
        {students.map((x) => { const cerrada = ['ACEPTADA', 'COMPLETADA'].includes(x.estado_matricula); const action = expedienteAction(x.estado_matricula); return <tr key={x.id} className="border-b border-cream-200 hover:bg-cream-50"><td className="p-3"><b>{x.nombre_completo}</b><div className="text-xs text-primary-500">{x.codigo_alumno} · DNI {x.dni || 'no registrado'}</div></td><td className="p-3">{x.apoderado || <span className="text-rose-600">Sin apoderado</span>}<div className="text-xs text-primary-500">{x.celular || ''}</div></td><td className="p-3">{x.grado} {x.seccion}<div className="text-xs text-primary-500">{x.nivel}</div></td><td className="p-3 font-semibold">{money(x.deuda_actual)}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge[x.estado_matricula] || 'bg-gray-100 text-gray-600'}`}>{labels[x.estado_matricula] || 'Sin iniciar'}</span></td><td className="p-3 text-right">{x.id_matricula && <button onClick={() => openDetail(x.id_matricula)} className={`${btn} mr-2 border py-2 ${action.classes}`}><HiEye />{action.label}</button>}{!cerrada && <button onClick={() => createInvite(x)} disabled={!x.id_padre || !config.id} className={`${btn} bg-primary-700 py-2 text-white`}><HiMail />{x.id_matricula ? 'Reenviar' : 'Invitar'}</button>}</td></tr>; })}
      </tbody></table></div>
      {!students.length && <p className="py-10 text-center text-primary-400">No hay coincidencias.</p>}
    </Card>

    {invite && <div className="fixed inset-0 z-[70] grid place-items-center bg-primary-950/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><div><h2 className="font-display text-2xl text-primary-800">Invitación preparada</h2><p className="text-sm text-primary-500">{invite.student} · {invite.codigo}</p></div><button onClick={() => setInvite(null)}><HiX className="h-6 w-6"/></button></div><div className="mt-5 whitespace-pre-wrap rounded-xl bg-cream-50 p-4 text-sm text-primary-800">{invite.mensaje}</div><p className="mt-3 text-xs text-primary-500">El código solo se muestra aquí y vence en 24 horas. El enlace vence en 7 días.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={() => navigator.clipboard.writeText(invite.mensaje)} className={`${btn} border border-cream-300`}>Copiar mensaje</button><button onClick={openWhatsApp} className={`${btn} bg-emerald-600 text-white`}>Abrir WhatsApp</button></div></div></div>}

    <Modal isOpen={newStudentOpen} onClose={() => setNewStudentOpen(false)} title="Nuevo alumno para matrícula digital" size="lg">
      <form onSubmit={saveNewStudent} className="space-y-5">
        <div><h3 className="mb-3 font-semibold text-primary-800">Datos del estudiante</h3><div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Código *<input required value={studentForm.codigo_alumno} onChange={(e) => setStudentForm({...studentForm,codigo_alumno:e.target.value})} className={`${field} mt-1`}/></label>
          <label className="text-sm">DNI<input maxLength="8" value={studentForm.dni} onChange={(e) => setStudentForm({...studentForm,dni:e.target.value})} className={`${field} mt-1`}/></label>
          <label className="text-sm md:col-span-2">Nombre completo *<input required value={studentForm.nombre_completo} onChange={(e) => setStudentForm({...studentForm,nombre_completo:e.target.value})} className={`${field} mt-1`}/></label>
          <label className="text-sm">Matrícula (S/)<input type="number" min="0" step="0.01" value={studentForm.monto_matricula} onChange={(e) => setStudentForm({...studentForm,monto_matricula:e.target.value})} className={`${field} mt-1`}/></label>
          <label className="text-sm">Materiales (S/)<input type="number" min="0" step="0.01" value={studentForm.monto_materiales} onChange={(e) => setStudentForm({...studentForm,monto_materiales:e.target.value})} className={`${field} mt-1`}/></label>
          <label className="text-sm">Pensión (S/)<input type="number" min="0" step="0.01" value={studentForm.monto_pension} onChange={(e) => setStudentForm({...studentForm,monto_pension:e.target.value})} className={`${field} mt-1`}/></label>
        </div></div>
        <div><h3 className="mb-3 font-semibold text-primary-800">Asignación de aula</h3><div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">Nivel *<select required value={studentForm.id_nivel} onChange={(e) => setStudentForm({...studentForm,id_nivel:e.target.value,id_grado:'',id_aula:''})} className={`${field} mt-1`}><option value="">Seleccione...</option>{niveles.map((n)=><option key={n.id} value={n.id}>{n.nombre}</option>)}</select></label>
          <label className="text-sm">Grado *<select required disabled={!studentForm.id_nivel} value={studentForm.id_grado} onChange={(e) => setStudentForm({...studentForm,id_grado:e.target.value,id_aula:''})} className={`${field} mt-1`}><option value="">Seleccione...</option>{grades.map((g)=><option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label>
          <label className="text-sm">Sección *<select required disabled={!studentForm.id_grado} value={studentForm.id_aula} onChange={(e) => setStudentForm({...studentForm,id_aula:e.target.value})} className={`${field} mt-1`}><option value="">Seleccione...</option>{classrooms.map((a)=><option key={a.id} value={a.id}>Sección {a.seccion}</option>)}</select></label>
        </div></div>
        <div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-primary-800">Padre / apoderado</h3><div className="flex rounded-lg border p-1"><button type="button" onClick={()=>{setParentMode('existing');setSelectedParent(null);}} className={`rounded-md px-3 py-1.5 text-sm ${parentMode==='existing'?'bg-primary-700 text-white':''}`}>Existente</button><button type="button" onClick={()=>setParentMode('new')} className={`rounded-md px-3 py-1.5 text-sm ${parentMode==='new'?'bg-primary-700 text-white':''}`}><HiUserAdd className="inline"/> Nuevo</button></div></div>
          {parentMode === 'existing' ? <div>{selectedParent ? <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3"><div><b>{selectedParent.nombre_completo}</b><p className="text-sm">DNI {selectedParent.dni} · {selectedParent.celular}</p></div><button type="button" onClick={()=>setSelectedParent(null)} className="text-sm text-primary-700">Cambiar</button></div> : <><div className="flex gap-2"><input value={parentQuery} onChange={(e)=>setParentQuery(e.target.value)} placeholder="DNI o nombre del apoderado" className={field}/><button type="button" onClick={searchParent} className={`${btn} border`}><HiSearch/>Buscar</button></div>{parentResults.length > 0 && <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border">{parentResults.map((p)=><button type="button" key={p.id} onClick={()=>setSelectedParent(p)} className="block w-full border-b p-3 text-left hover:bg-cream-50"><b>{p.nombre_completo}</b> · DNI {p.dni} · {p.celular}</button>)}</div>}</>}</div> : <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">DNI *<input required maxLength="8" value={parentForm.dni} onChange={(e)=>setParentForm({...parentForm,dni:e.target.value})} className={`${field} mt-1`}/></label><label className="text-sm">Nombre completo *<input required value={parentForm.nombre_completo} onChange={(e)=>setParentForm({...parentForm,nombre_completo:e.target.value})} className={`${field} mt-1`}/></label><label className="text-sm">Celular *<input required maxLength="9" value={parentForm.celular} onChange={(e)=>setParentForm({...parentForm,celular:e.target.value})} className={`${field} mt-1`}/></label><label className="text-sm">Usuario de acceso *<input required value={parentForm.username} onChange={(e)=>setParentForm({...parentForm,username:e.target.value})} className={`${field} mt-1`}/></label><label className="text-sm md:col-span-2">Contraseña inicial *<input required type="password" value={parentForm.contrasena} onChange={(e)=>setParentForm({...parentForm,contrasena:e.target.value})} className={`${field} mt-1`}/></label>
          </div>}
        </div>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setNewStudentOpen(false)} className={`${btn} border`}>Cancelar</button><button disabled={studentSaving} className={`${btn} bg-primary-700 text-white`}>{studentSaving?'Guardando...':'Crear alumno'}</button></div>
      </form>
    </Modal>

    {detail && <div className="fixed inset-0 z-[70] overflow-y-auto bg-primary-950/50 p-4"><div className="mx-auto my-6 max-w-4xl rounded-2xl bg-white p-6 shadow-2xl print:my-0 print:shadow-none"><div className="flex justify-between"><div><h2 className="font-display text-2xl text-primary-800">Expediente {detail.codigo}</h2><p className="text-sm text-primary-500">{detail.datos_snapshot?.alumno?.nombre} · {detail.estado}</p></div><button className="print:hidden" onClick={() => setDetail(null)}><HiX className="h-6 w-6"/></button></div><div className="mt-5 grid gap-4 md:grid-cols-3">{[['Apoderado', `${detail.datos_snapshot?.apoderado?.nombre || ''}${detail.datos_formulario?.vinculo_representante ? ` · ${detail.datos_formulario.vinculo_representante}` : ''}`], ['Aceptado', detail.aceptado_en ? new Date(detail.aceptado_en).toLocaleString('es-PE') : 'Pendiente'], ['Resumen financiero', `${money(detail.deuda_snapshot)} + matrícula ${money(detail.costo_matricula_snapshot)}`]].map(([a,b]) => <div key={a} className="rounded-xl bg-cream-50 p-4"><p className="text-xs uppercase text-primary-500">{a}</p><p className="mt-1 font-semibold">{b}</p></div>)}</div><h3 className="mt-6 font-semibold text-primary-800">Antecedente y situación escolar</h3><div className="mt-2 grid gap-3 md:grid-cols-2"><div className="rounded-lg border p-3 text-sm"><p><b>Tipo de ingreso:</b> {detail.datos_formulario?.tipo_ingreso?.replaceAll('_',' ') || 'No registrado'}</p><p><b>Condición:</b> {detail.datos_formulario?.condicion_promocion?.replaceAll('_',' ') || 'No aplica'}</p><p><b>Grado de matrícula:</b> {detail.datos_snapshot?.alumno?.nivel} · {detail.datos_snapshot?.alumno?.grado} {detail.datos_snapshot?.alumno?.seccion}</p></div><div className="rounded-lg border p-3 text-sm"><p><b>Antecedente:</b> {detail.datos_formulario?.anio_escolar_anterior || '-'} · {detail.datos_formulario?.nivel_anterior || ''} {detail.datos_formulario?.grado_anterior || ''}</p><p><b>Procedencia:</b> {detail.datos_formulario?.institucion_procedencia || '-'}</p><p><b>Código modular:</b> {detail.datos_formulario?.codigo_modular_procedencia || '-'}</p><p><b>Ubicación:</b> {detail.datos_formulario?.ubicacion_procedencia || '-'}</p></div></div><h3 className="mt-6 font-semibold text-primary-800">Personas autorizadas en una emergencia</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{[detail.datos_formulario?.persona_autorizada_1, detail.datos_formulario?.persona_autorizada_2].filter((p) => p?.nombre).map((p, i) => <div key={i} className="rounded-lg border p-3 text-sm"><b>{p.nombre}</b><p>DNI: {p.dni} · {p.parentesco}</p><p>Celular: {p.celular}</p></div>)}</div><h3 className="mt-6 font-semibold text-primary-800">Control de entrega documental</h3><p className="mt-1 text-sm text-primary-500">Este control solo registra la entrega física; no almacena archivos.</p><div className="mt-3 space-y-2">{documentosControl.map(([key, label]) => { const item = documentCheck[key] || { estado: 'PENDIENTE', observacion: '' }; return <div key={key} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_170px_1fr] md:items-center"><span className="text-sm font-medium">{label}</span><select value={item.estado} onChange={(e) => setDocumentCheck({ ...documentCheck, [key]: { ...item, estado: e.target.value } })} className={field}><option value="PENDIENTE">Pendiente</option><option value="ENTREGADO">Entregado</option><option value="NO_APLICA">No aplica</option></select><input value={item.observacion || ''} onChange={(e) => setDocumentCheck({ ...documentCheck, [key]: { ...item, observacion: e.target.value } })} placeholder="Observación opcional" maxLength="500" className={field}/></div>; })}</div><div className="mt-3 flex justify-end print:hidden"><button type="button" onClick={saveDocumentCheck} disabled={documentSaving} className={`${btn} bg-primary-700 text-white`}>{documentSaving ? 'Guardando...' : 'Guardar control de entrega'}</button></div><h3 className="mt-6 font-semibold text-primary-800">Aceptaciones</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{detail.documentos_snapshot.map((d) => <div key={d.clave} className="flex items-center gap-2 rounded-lg border p-3"><HiCheckCircle className={detail.aceptaciones_json?.[d.clave] ? 'text-emerald-600' : 'text-gray-300'} />{d.nombre} · versión {d.version}</div>)}</div><h3 className="mt-6 font-semibold text-primary-800">Trazabilidad</h3><div className="mt-2 space-y-2">{detail.eventos.map((e) => <div key={e.id} className="flex justify-between rounded-lg bg-cream-50 p-3 text-sm"><span>{String(e.evento).replaceAll('_',' ')}</span><span className="text-primary-500">{new Date(e.creado_en).toLocaleString('es-PE')}</span></div>)}</div>{detail.hash_evidencia && <p className="mt-5 break-all rounded-lg border border-dashed border-gold-400 p-3 font-mono text-xs">Huella de evidencia SHA-256: {detail.hash_evidencia}</p>}<div className="mt-6 print:hidden"><textarea value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Observación de revisión" className={field}/><div className="mt-3 flex flex-wrap justify-end gap-2"><button onClick={() => window.print()} className={`${btn} border`}><HiPrinter/>Imprimir evidencia</button><button onClick={() => review('OBSERVADA')} disabled={!detail.aceptado_en || !observation.trim()} className={`${btn} bg-amber-500 text-white`}>Observar</button><button onClick={() => review('COMPLETADA')} disabled={!detail.aceptado_en} className={`${btn} bg-emerald-600 text-white`}>Completar matrícula</button></div></div></div></div>}
  </div>;
}


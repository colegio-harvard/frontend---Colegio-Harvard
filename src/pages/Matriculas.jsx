import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCheckCircle, HiCog, HiEye, HiMail, HiPlus, HiPrinter, HiRefresh, HiSearch, HiUserAdd, HiX } from 'react-icons/hi';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { cargarMatriculas, generarInvitacionMatricula, guardarBorradorAsistidoMatricula, guardarConfiguracionMatricula, guardarControlDocumentalMatricula, obtenerExpedienteMatricula, revisarMatricula } from '../services/matriculasService';
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
  if (!status || ['SIN_INICIAR', 'BORRADOR', 'ENVIADA'].includes(status)) return { label: 'Cargar datos', classes: 'border-cream-300 bg-white text-primary-700' };
  if (status === 'ABIERTA') return { label: 'Continuar / ver datos', classes: 'border-amber-300 bg-amber-50 text-amber-800' };
  if (status === 'ACEPTADA') return { label: 'Revisar y completar', classes: 'border-emerald-600 bg-emerald-600 text-white' };
  if (status === 'OBSERVADA') return { label: 'Corregir matrícula', classes: 'border-rose-300 bg-rose-50 text-rose-700' };
  if (status === 'COMPLETADA') return { label: 'Ver expediente', classes: 'border-cream-300 bg-white text-primary-700' };
  return { label: 'Ver datos', classes: 'border-cream-300 bg-white text-primary-700' };
};

const field = 'w-full rounded-lg border border-cream-300 px-3 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-100';
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const gradosPorNivel = {
  Inicial: [['3', '3 años'], ['4', '4 años'], ['5', '5 años']],
  Primaria: [['1', '1.er grado'], ['2', '2.º grado'], ['3', '3.er grado'], ['4', '4.º grado'], ['5', '5.º grado'], ['6', '6.º grado']],
  Secundaria: [['1', '1.er grado'], ['2', '2.º grado'], ['3', '3.er grado'], ['4', '4.º grado'], ['5', '5.º grado']],
};
const documentosControl = [
  ['certificado_estudios', 'Certificado de estudios del colegio de origen'],
  ['ficha_unica_matricula', 'Ficha única de matrícula'],
  ['libreta_anterior', 'Libreta del año anterior'],
  ['dni_alumno', 'Copia del DNI del alumno'],
  ['dni_apoderado', 'Copia del DNI del apoderado'],
  ['foto_alumno', 'Foto tamaño carné del alumno'],
  ['foto_apoderado', 'Foto tamaño carné del apoderado'],
];
const emptyAssistedDraft = { alumno_apellido_paterno: '', alumno_apellido_materno: '', alumno_nombres: '', alumno_dni: '', alumno_fecha_nacimiento: '', alumno_sexo: '', alumno_pais_origen: 'Perú', alumno_ubicacion_origen: '', alumno_requiere_cuidado_especial: 'NO', alumno_detalle_cuidado_especial: '', representante_apellido_paterno: '', representante_apellido_materno: '', representante_nombres: '', representante_dni: '', vinculo_representante: '', celular: '', email: '', direccion: '', contacto_emergencia: '', telefono_emergencia: '', centro_salud_emergencia: '', observaciones_salud: '', tipo_ingreso: '', condicion_promocion: '', anio_escolar_anterior: '', nivel_anterior: '', grado_anterior: '', institucion_procedencia: '', codigo_modular_procedencia: '', ubicacion_procedencia: '', persona_autorizada_1: { nombre: '', dni: '', parentesco: '', celular: '' }, persona_autorizada_2: { nombre: '', dni: '', parentesco: '', celular: '' } };

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
  const [assistedDraft, setAssistedDraft] = useState(emptyAssistedDraft);
  const [representanteRetiraAsistido, setRepresentanteRetiraAsistido] = useState(false);
  const [assistedEditing, setAssistedEditing] = useState(false);
  const [assistedSaving, setAssistedSaving] = useState(false);
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
    try { const response = await obtenerExpedienteMatricula(id); const expediente = response.data.data; const formularioBase = Object.keys(expediente.borrador_asistido || {}).length ? expediente.borrador_asistido : expediente.datos_formulario; const traslado = formularioBase?.tipo_ingreso === 'TRASLADO'; const defaults = Object.fromEntries(documentosControl.map(([key]) => [key, { estado: ['certificado_estudios', 'libreta_anterior'].includes(key) && !traslado ? 'NO_APLICA' : 'PENDIENTE', observacion: '' }])); setDetail(expediente); setAssistedDraft({ ...emptyAssistedDraft, ...(formularioBase || {}), alumno_dni: formularioBase?.alumno_dni || expediente.datos_snapshot?.alumno?.dni || '', representante_dni: formularioBase?.representante_dni || expediente.datos_snapshot?.apoderado?.dni || '', persona_autorizada_1: { ...emptyAssistedDraft.persona_autorizada_1, ...(formularioBase?.persona_autorizada_1 || {}) }, persona_autorizada_2: { ...emptyAssistedDraft.persona_autorizada_2, ...(formularioBase?.persona_autorizada_2 || {}) } }); setAssistedEditing(false); setRepresentanteRetiraAsistido(false); setDocumentCheck({ ...defaults, ...(expediente.control_documental || {}) }); setObservation(expediente.observacion_revision || ''); }
    catch (error) { toast.error(error.response?.data?.error || 'No se pudo abrir el expediente'); }
  };
  const saveAssistedDraft = async () => {
    setAssistedSaving(true);
    try { const response = await guardarBorradorAsistidoMatricula(detail.id, assistedDraft); setDetail({ ...detail, borrador_asistido: response.data.data.borrador_asistido, borrador_preparado_en: response.data.data.borrador_preparado_en }); setAssistedEditing(false); toast.success('Borrador preparado para la verificación del apoderado'); }
    catch (error) { toast.error(error.response?.data?.error || 'No se pudo guardar el borrador asistido'); }
    finally { setAssistedSaving(false); }
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

    {detail && <div className="fixed inset-0 z-[70] overflow-y-auto bg-primary-950/50 p-4"><div className="mx-auto my-6 max-w-4xl rounded-2xl bg-white p-6 shadow-2xl print:my-0 print:shadow-none"><div className="flex justify-between"><div><h2 className="font-display text-2xl text-primary-800">Expediente {detail.codigo}</h2><p className="text-sm text-primary-500">{detail.datos_snapshot?.alumno?.nombre} · {detail.estado}</p></div><button className="print:hidden" onClick={() => setDetail(null)}><HiX className="h-6 w-6"/></button></div><div className="mt-5 grid gap-4 md:grid-cols-3">{[['Apoderado', `${detail.datos_snapshot?.apoderado?.nombre || ''}${detail.datos_formulario?.vinculo_representante ? ` · ${detail.datos_formulario.vinculo_representante}` : ''}`], ['Aceptado', detail.aceptado_en ? new Date(detail.aceptado_en).toLocaleString('es-PE') : 'Pendiente'], ['Resumen financiero', `${money(detail.deuda_snapshot)} + matrícula ${money(detail.costo_matricula_snapshot)}`]].map(([a,b]) => <div key={a} className="rounded-xl bg-cream-50 p-4"><p className="text-xs uppercase text-primary-500">{a}</p><p className="mt-1 font-semibold">{b}</p></div>)}</div><div className="mt-6 rounded-xl border-2 border-gold-200 bg-amber-50/40 p-4 print:hidden"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-primary-800">Matrícula asistida</h3><p className="text-sm text-primary-500">{detail.borrador_preparado_en ? `Borrador preparado el ${new Date(detail.borrador_preparado_en).toLocaleString('es-PE')}` : 'Prepare los datos para que el apoderado solamente los revise y confirme.'}</p></div>{!['ACEPTADA','COMPLETADA'].includes(detail.estado) && <button type="button" onClick={() => setAssistedEditing(!assistedEditing)} className={`${btn} border bg-white`}>{assistedEditing ? 'Cerrar edición' : 'Preparar datos'}</button>}</div>{assistedEditing && <div className="mt-4 space-y-4"><div><h4 className="font-semibold text-primary-800">Datos de la estudiante</h4><p className="mt-1 text-xs text-primary-500">Las correcciones quedan en esta matrícula y no cambian automáticamente su ficha principal.</p>{detail.datos_snapshot?.alumno?.nombre && <p className="mt-2 rounded-lg bg-cream-50 p-2 text-xs"><b>Nombre registrado:</b> {detail.datos_snapshot.alumno.nombre}</p>}<div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm">Apellido paterno<input value={assistedDraft.alumno_apellido_paterno || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_apellido_paterno: e.target.value })} className={`${field} mt-1`} /></label><label className="text-sm">Apellido materno<input value={assistedDraft.alumno_apellido_materno || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_apellido_materno: e.target.value })} className={`${field} mt-1`} /></label><label className="text-sm">Nombres<input value={assistedDraft.alumno_nombres || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_nombres: e.target.value })} className={`${field} mt-1`} /></label><label className="text-sm">DNI<input inputMode="numeric" maxLength="8" value={assistedDraft.alumno_dni || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} className={`${field} mt-1`} /></label><label className="text-sm">Fecha de nacimiento<input type="date" value={assistedDraft.alumno_fecha_nacimiento || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_fecha_nacimiento: e.target.value })} className={`${field} mt-1`} /></label><label className="text-sm">Sexo<select value={assistedDraft.alumno_sexo || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_sexo: e.target.value })} className={`${field} mt-1`}><option value="">Seleccione...</option><option value="FEMENINO">Femenino</option><option value="MASCULINO">Masculino</option></select></label><label className="text-sm">País de origen<input value={assistedDraft.alumno_pais_origen || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_pais_origen: e.target.value })} className={`${field} mt-1`} /></label><label className="text-sm">Departamento / provincia / distrito<input value={assistedDraft.alumno_ubicacion_origen || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_ubicacion_origen: e.target.value })} className={`${field} mt-1`} /></label><label className="text-sm">¿Requiere cuidado especial?<select value={assistedDraft.alumno_requiere_cuidado_especial || 'NO'} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_requiere_cuidado_especial: e.target.value, alumno_detalle_cuidado_especial: e.target.value === 'SI' ? assistedDraft.alumno_detalle_cuidado_especial : '' })} className={`${field} mt-1`}><option value="NO">No</option><option value="SI">Sí</option></select></label>{assistedDraft.alumno_requiere_cuidado_especial === 'SI' && <label className="text-sm">Detalle del cuidado especial<input value={assistedDraft.alumno_detalle_cuidado_especial || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, alumno_detalle_cuidado_especial: e.target.value })} className={`${field} mt-1`} /></label>}</div></div><div className="border-t pt-4"><h4 className="font-semibold text-primary-800">Datos del representante legal</h4><p className="mt-1 text-xs text-primary-500">Las correcciones quedan en la ficha de matrícula y no cambian su cuenta de acceso.</p><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm">Apellido paterno<input value={assistedDraft.representante_apellido_paterno || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, representante_apellido_paterno: e.target.value })} className={`${field} mt-1`} /></label><label className="text-sm">Apellido materno<input value={assistedDraft.representante_apellido_materno || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, representante_apellido_materno: e.target.value })} className={`${field} mt-1`} /></label><label className="text-sm">Nombres<input value={assistedDraft.representante_nombres || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, representante_nombres: e.target.value })} className={`${field} mt-1`} /></label><label className="text-sm">DNI<input inputMode="numeric" maxLength="8" value={assistedDraft.representante_dni || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, representante_dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} className={`${field} mt-1`} /></label>{[['vinculo_representante','Vínculo con el estudiante'],['celular','Celular'],['email','Correo electrónico'],['direccion','Dirección actual']].map(([key,label]) => <label key={key} className="text-sm">{label}<input value={assistedDraft[key] || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, [key]: e.target.value })} className={`${field} mt-1`} /></label>)}</div></div><div className="border-t pt-4"><h4 className="font-semibold text-primary-800">Datos de emergencia</h4><div className="mt-3 grid gap-3 md:grid-cols-2">{[['contacto_emergencia','Contacto de emergencia'],['telefono_emergencia','Teléfono de emergencia'],['centro_salud_emergencia','Centro de salud'],['observaciones_salud','Observaciones de salud']].map(([key,label]) => <label key={key} className="text-sm">{label}<input value={assistedDraft[key] || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, [key]: e.target.value })} className={`${field} mt-1`} /></label>)}</div></div><div className="grid gap-3 border-t pt-4 md:grid-cols-2"><label className="text-sm">Tipo de ingreso<select value={assistedDraft.tipo_ingreso} onChange={(e) => setAssistedDraft({ ...assistedDraft, tipo_ingreso: e.target.value, institucion_procedencia: e.target.value === 'PROMOCION_INTERNA' ? 'Colegio Harvard' : assistedDraft.institucion_procedencia })} className={`${field} mt-1`}><option value="">Seleccione...</option><option value="PROMOCION_INTERNA">Promoción interna</option><option value="TRASLADO">Traslado</option><option value="INGRESO_INICIAL">Ingreso inicial</option><option value="REPITENCIA">Repitencia</option></select></label><label className="text-sm">Condición de promoción<select value={assistedDraft.condicion_promocion} onChange={(e) => setAssistedDraft({ ...assistedDraft, condicion_promocion: e.target.value })} className={`${field} mt-1`}><option value="">Seleccione...</option><option value="PROMOVIDO">Promovido</option><option value="REPITE">Repite el grado</option><option value="PENDIENTE">Pendiente de documentos</option></select></label><label className="text-sm">Año escolar anterior<input value={assistedDraft.anio_escolar_anterior || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, anio_escolar_anterior: e.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" maxLength="4" className={`${field} mt-1`} /></label><label className="text-sm">Nivel anterior<select value={assistedDraft.nivel_anterior || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, nivel_anterior: e.target.value, grado_anterior: '' })} className={`${field} mt-1`}><option value="">Seleccione...</option><option>Inicial</option><option>Primaria</option><option>Secundaria</option></select></label><label className="text-sm">Grado anterior<select disabled={!assistedDraft.nivel_anterior} value={assistedDraft.grado_anterior || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, grado_anterior: e.target.value })} className={`${field} mt-1 disabled:bg-cream-100`}><option value="">{assistedDraft.nivel_anterior ? 'Seleccione el grado...' : 'Seleccione primero el nivel...'}</option>{(gradosPorNivel[assistedDraft.nivel_anterior] || []).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{[['institucion_procedencia','Institución de procedencia'],['codigo_modular_procedencia','Código modular'],['ubicacion_procedencia','Departamento / provincia / distrito']].map(([key,label]) => <label key={key} className="text-sm">{label}<input value={assistedDraft[key] || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, [key]: e.target.value })} className={`${field} mt-1`} /></label>)}</div><div className="border-t pt-4"><h4 className="font-semibold text-primary-800">Personas autorizadas para recoger al estudiante</h4><p className="mt-1 text-xs text-primary-500">La persona principal es obligatoria; la alternativa es opcional.</p><label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-gold-200 bg-amber-50 p-3 text-sm"><input type="checkbox" checked={representanteRetiraAsistido} onChange={(e) => { const checked = e.target.checked; setRepresentanteRetiraAsistido(checked); if (checked) setAssistedDraft({ ...assistedDraft, persona_autorizada_1: { nombre: [assistedDraft.representante_nombres, assistedDraft.representante_apellido_paterno, assistedDraft.representante_apellido_materno].filter(Boolean).join(' '), dni: assistedDraft.representante_dni, parentesco: assistedDraft.vinculo_representante || 'Representante legal', celular: assistedDraft.celular } }); }} className="h-4 w-4 accent-primary-700"/><span>El representante legal será la persona autorizada principal</span></label>{[1,2].map((number) => { const key = `persona_autorizada_${number}`; const person = assistedDraft[key] || {}; return <div key={key} className="mt-3 rounded-lg border bg-white p-3"><p className="mb-2 text-sm font-semibold">{number === 1 ? 'Persona principal *' : 'Persona alternativa (opcional)'}</p><div className="grid gap-2 md:grid-cols-4">{[['nombre','Nombre completo'],['dni','DNI'],['parentesco','Parentesco'],['celular','Celular']].map(([property,label]) => <input key={property} value={person[property] || ''} onChange={(e) => setAssistedDraft({ ...assistedDraft, [key]: { ...person, [property]: property === 'dni' ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value } })} inputMode={property === 'dni' ? 'numeric' : undefined} maxLength={property === 'dni' ? 8 : undefined} placeholder={`${label}${number === 1 ? ' *' : ''}`} className={field}/>)}</div></div>; })}</div><div className="flex justify-end"><button type="button" onClick={saveAssistedDraft} disabled={assistedSaving} className={`${btn} bg-primary-700 text-white`}>{assistedSaving ? 'Guardando...' : 'Guardar borrador para verificar'}</button></div></div>}</div><h3 className="mt-6 font-semibold text-primary-800">Datos de la estudiante</h3><div className="mt-2 grid gap-3 md:grid-cols-2"><div className="rounded-lg border p-3 text-sm"><p><b>Apellidos y nombres:</b> {[detail.datos_formulario?.alumno_apellido_paterno, detail.datos_formulario?.alumno_apellido_materno, detail.datos_formulario?.alumno_nombres].filter(Boolean).join(' ') || detail.datos_snapshot?.alumno?.nombre || '-'}</p><p><b>DNI:</b> {detail.datos_formulario?.alumno_dni || detail.datos_snapshot?.alumno?.dni || '-'}</p><p><b>Nacimiento:</b> {detail.datos_formulario?.alumno_fecha_nacimiento || '-'}</p><p><b>Sexo:</b> {detail.datos_formulario?.alumno_sexo || '-'}</p></div><div className="rounded-lg border p-3 text-sm"><p><b>Origen:</b> {[detail.datos_formulario?.alumno_pais_origen, detail.datos_formulario?.alumno_ubicacion_origen].filter(Boolean).join(' · ') || '-'}</p><p><b>Cuidado especial:</b> {detail.datos_formulario?.alumno_requiere_cuidado_especial === 'SI' ? detail.datos_formulario?.alumno_detalle_cuidado_especial || 'Sí' : 'No'}</p><p><b>Grado de matrícula:</b> {detail.datos_snapshot?.alumno?.nivel} · {detail.datos_snapshot?.alumno?.grado} {detail.datos_snapshot?.alumno?.seccion}</p></div></div><h3 className="mt-6 font-semibold text-primary-800">Antecedente y situación escolar</h3><div className="mt-2 grid gap-3 md:grid-cols-2"><div className="rounded-lg border p-3 text-sm"><p><b>Tipo de ingreso:</b> {detail.datos_formulario?.tipo_ingreso?.replaceAll('_',' ') || 'No registrado'}</p><p><b>Condición:</b> {detail.datos_formulario?.condicion_promocion?.replaceAll('_',' ') || 'No aplica'}</p><p><b>Grado de matrícula:</b> {detail.datos_snapshot?.alumno?.nivel} · {detail.datos_snapshot?.alumno?.grado} {detail.datos_snapshot?.alumno?.seccion}</p></div><div className="rounded-lg border p-3 text-sm"><p><b>Antecedente:</b> {detail.datos_formulario?.anio_escolar_anterior || '-'} · {detail.datos_formulario?.nivel_anterior || ''} {detail.datos_formulario?.grado_anterior || ''}</p><p><b>Procedencia:</b> {detail.datos_formulario?.institucion_procedencia || '-'}</p><p><b>Código modular:</b> {detail.datos_formulario?.codigo_modular_procedencia || '-'}</p><p><b>Ubicación:</b> {detail.datos_formulario?.ubicacion_procedencia || '-'}</p></div></div><h3 className="mt-6 font-semibold text-primary-800">Personas autorizadas en una emergencia</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{[detail.datos_formulario?.persona_autorizada_1, detail.datos_formulario?.persona_autorizada_2].filter((p) => p?.nombre).map((p, i) => <div key={i} className="rounded-lg border p-3 text-sm"><b>{p.nombre}</b><p>DNI: {p.dni} · {p.parentesco}</p><p>Celular: {p.celular}</p></div>)}</div><h3 className="mt-6 font-semibold text-primary-800">Control de entrega documental</h3><p className="mt-1 text-sm text-primary-500">Este control solo registra la entrega física; no almacena archivos.</p><div className="mt-3 space-y-2">{documentosControl.map(([key, label]) => { const item = documentCheck[key] || { estado: 'PENDIENTE', observacion: '' }; return <div key={key} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_170px_1fr] md:items-center"><span className="text-sm font-medium">{label}</span><select value={item.estado} onChange={(e) => setDocumentCheck({ ...documentCheck, [key]: { ...item, estado: e.target.value } })} className={field}><option value="PENDIENTE">Pendiente</option><option value="ENTREGADO">Entregado</option><option value="NO_APLICA">No aplica</option></select><input value={item.observacion || ''} onChange={(e) => setDocumentCheck({ ...documentCheck, [key]: { ...item, observacion: e.target.value } })} placeholder="Observación opcional" maxLength="500" className={field}/></div>; })}</div><div className="mt-3 flex justify-end print:hidden"><button type="button" onClick={saveDocumentCheck} disabled={documentSaving} className={`${btn} bg-primary-700 text-white`}>{documentSaving ? 'Guardando...' : 'Guardar control de entrega'}</button></div><h3 className="mt-6 font-semibold text-primary-800">Aceptaciones</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{detail.documentos_snapshot.map((d) => <div key={d.clave} className="flex items-center gap-2 rounded-lg border p-3"><HiCheckCircle className={detail.aceptaciones_json?.[d.clave] ? 'text-emerald-600' : 'text-gray-300'} />{d.nombre} · versión {d.version}</div>)}</div><h3 className="mt-6 font-semibold text-primary-800">Trazabilidad</h3><div className="mt-2 space-y-2">{detail.eventos.map((e) => <div key={e.id} className="flex justify-between rounded-lg bg-cream-50 p-3 text-sm"><span>{String(e.evento).replaceAll('_',' ')}</span><span className="text-primary-500">{new Date(e.creado_en).toLocaleString('es-PE')}</span></div>)}</div>{detail.hash_evidencia && <p className="mt-5 break-all rounded-lg border border-dashed border-gold-400 p-3 font-mono text-xs">Huella de evidencia SHA-256: {detail.hash_evidencia}</p>}<div className="mt-6 print:hidden"><textarea value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Observación de revisión" className={field}/><div className="mt-3 flex flex-wrap justify-end gap-2"><button onClick={() => window.print()} className={`${btn} border`}><HiPrinter/>Imprimir evidencia</button><button onClick={() => review('OBSERVADA')} disabled={!detail.aceptado_en || !observation.trim()} className={`${btn} bg-amber-500 text-white`}>Observar</button><button onClick={() => review('COMPLETADA')} disabled={!detail.aceptado_en} className={`${btn} bg-emerald-600 text-white`}>Completar matrícula</button></div></div></div></div>}
  </div>;
}


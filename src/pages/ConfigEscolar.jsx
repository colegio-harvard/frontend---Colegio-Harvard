import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { listarAños, crearAño, activarAño, listarNiveles, crearNivel, actualizarNivel, listarGrados, crearGrado, actualizarGrado, listarAulas, crearAula, asignarTutor, listarPuntosEscaneo, listarHorarios, guardarHorario, obtenerColegio, actualizarColegio } from '../services/configEscolarService';
import { listarUsuarios } from '../services/usuariosService';
import apiClient from '../services/apiClient';
import { HiPlus, HiPencil, HiClock, HiEye, HiBell, HiGlobe, HiX, HiMenuAlt4, HiExclamation, HiInformationCircle, HiTrash, HiSpeakerphone } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { formatFecha, formatFechaHora } from '../utils/formatters';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { crearNotifPersonalizada, listarNotifPersonalizadas, eliminarNotifPersonalizada } from '../services/notifPersonalizadasService';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componente sortable card para cada pago en el grid DnD
const SortablePaymentItem = ({ item, onRemove, onUpdate }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.clave });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.8 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`relative rounded-xl border-2 p-3 bg-white transition-shadow ${isDragging ? 'shadow-lg border-gold-400' : 'border-cream-200 hover:border-cream-300'}`}>
      {/* Header: drag handle + badge + delete */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-cream-400 hover:text-cream-600 p-0.5" title="Arrastrar">
          <HiMenuAlt4 className="w-4 h-4" />
        </button>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.tipo === 'mes' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
          {item.tipo === 'mes' ? 'Mes' : 'Custom'}
        </span>
        <button type="button" onClick={() => onRemove(item.clave)} className="text-cream-300 hover:text-red-500 transition-colors p-0.5" title="Eliminar">
          <HiX className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Nombre */}
      {item.tipo === 'mes' ? (
        <p className="text-sm font-bold text-primary-800 text-center mb-2 truncate">{item.nombre}</p>
      ) : (
        <input
          type="text"
          value={item.nombre}
          onChange={(e) => onUpdate(item.clave, 'nombre', e.target.value)}
          placeholder="Nombre del pago"
          maxLength={100}
          className="w-full text-sm font-bold text-primary-800 text-center mb-2 px-1.5 py-1 border border-cream-200 rounded-lg outline-none focus:border-gold-400 bg-cream-50/50"
        />
      )}
      {/* Comentario */}
      <textarea
        value={item.comentario}
        onChange={(e) => onUpdate(item.clave, 'comentario', e.target.value)}
        placeholder="Nota (opcional)"
        rows={1}
        maxLength={300}
        className="w-full px-2 py-1 text-[11px] text-cream-500 border border-cream-200 rounded-lg outline-none focus:border-gold-400 transition-colors resize-none bg-cream-50/30"
      />
    </div>
  );
};

// Componente del tab Pension con DnD
const PensionTab = ({ catalogoMeses, pagosActivos, setPagosActivos, pensionMeses, savingPension, onGuardar }) => {
  const mesesActivos = new Set(pagosActivos.filter(p => p.tipo === 'mes').map(p => p.clave));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleMes = (mesKey, mesNombre) => {
    if (mesesActivos.has(mesKey)) {
      setPagosActivos(prev => prev.filter(p => p.clave !== mesKey));
    } else {
      setPagosActivos(prev => [...prev, { clave: mesKey, nombre: mesNombre, tipo: 'mes', comentario: '' }]);
    }
  };

  const agregarPagoPersonalizado = () => {
    const existentes = pagosActivos.filter(p => p.tipo === 'personalizado');
    const maxNum = existentes.reduce((max, p) => {
      const match = p.clave.match(/^PAGO_(\d+)$/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    setPagosActivos(prev => [...prev, { clave: `PAGO_${maxNum + 1}`, nombre: '', tipo: 'personalizado', comentario: '' }]);
  };

  const removerPago = (clave) => {
    setPagosActivos(prev => prev.filter(p => p.clave !== clave));
  };

  const actualizarPago = (clave, campo, valor) => {
    setPagosActivos(prev => prev.map(p => p.clave === clave ? { ...p, [campo]: valor } : p));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setPagosActivos(prev => {
        const oldIndex = prev.findIndex(p => p.clave === active.id);
        const newIndex = prev.findIndex(p => p.clave === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const totalMeses = pagosActivos.filter(p => p.tipo === 'mes').length;
  const totalPersonalizados = pagosActivos.filter(p => p.tipo === 'personalizado').length;

  return (
    <Card title="Plantilla de Pensión">
      <p className="text-sm text-gold-600 mb-4">
        Seleccione meses o agregue pagos personalizados. Arrastre para reordenar.
        {pagosActivos.length === 0 && ' No hay plantilla configurada aún.'}
      </p>

      {/* Grid compacto de 12 meses */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 mb-6">
        {catalogoMeses.map(m => {
          const activo = mesesActivos.has(m.clave_mes);
          return (
            <button
              key={m.clave_mes}
              type="button"
              onClick={() => toggleMes(m.clave_mes, m.nombre)}
              className={`px-2 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                activo
                  ? 'border-gold-400 bg-gold-50 text-gold-700 shadow-sm'
                  : 'border-cream-200 bg-cream-50/30 text-cream-400 hover:border-cream-300 hover:text-cream-500'
              }`}
            >
              {m.nombre.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {/* Grid ordenable con DnD */}
      {pagosActivos.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-primary-800 mb-3">Pagos activos ({pagosActivos.length})</h4>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pagosActivos.map(p => p.clave)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {pagosActivos.map(item => (
                  <SortablePaymentItem
                    key={item.clave}
                    item={item}
                    onRemove={removerPago}
                    onUpdate={actualizarPago}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Boton agregar pago personalizado */}
      <button
        type="button"
        onClick={agregarPagoPersonalizado}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gold-700 bg-gold-50 rounded-lg hover:bg-gold-100 border border-gold-200 transition-colors mb-6"
      >
        <HiPlus className="w-4 h-4" /> Agregar pago personalizado
      </button>

      {/* Footer: contador + guardar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-cream-400">
          {pagosActivos.length} pago(s){totalMeses > 0 && `: ${totalMeses} mes(es)`}{totalPersonalizados > 0 && `${totalMeses > 0 ? ',' : ':'} ${totalPersonalizados} personalizado(s)`}
        </p>
        <button onClick={onGuardar} disabled={savingPension}
          className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
          {savingPension ? 'Guardando...' : (pensionMeses.length > 0 ? 'Actualizar Plantilla' : 'Crear Plantilla')}
        </button>
      </div>
    </Card>
  );
};

const ConfigEscolar = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('niveles');
  const [años, setAños] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [grados, setGrados] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [puntos, setPuntos] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [pensionMeses, setPensionMeses] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAula, setModalAula] = useState(false);
  const [modalTutor, setModalTutor] = useState(false);
  const [aulaForm, setAulaForm] = useState({ id_anio_escolar: '', id_grado: '', seccion: '' });
  const [tutorForm, setTutorForm] = useState({ id_aula: '', id_usuario_tutor: '' });
  const [horarioForms, setHorarioForms] = useState({});
  const [savingHorario, setSavingHorario] = useState(null);
  const [modalAño, setModalAño] = useState(false);
  const [añoForm, setAñoForm] = useState({ año: new Date().getFullYear() + 1, fecha_inicio: '', fecha_fin: '' });
  // Notificaciones tab state
  const [plantillas, setPlantillas] = useState([]);
  const [configPension, setConfigPension] = useState(null);
  const [modalPlantilla, setModalPlantilla] = useState({ open: false, item: null });
  const [plantillaForm, setPlantillaForm] = useState({ titulo: '', cuerpo: '', habilitada: true, tipo_entrega: 'buzon' });
  const [savingPensionConfig, setSavingPensionConfig] = useState(false);
  const [catalogoMeses, setCatalogoMeses] = useState([]);
  const [pagosActivos, setPagosActivos] = useState([]);
  const [savingPension, setSavingPension] = useState(false);
  // Notif. Personalizadas tab state
  const [notifPersonalizadas, setNotifPersonalizadas] = useState([]);
  const [notifForm, setNotifForm] = useState({ titulo: '', cuerpo: '', tipo_entrega: 'buzon', tipo_audiencia: 'COLEGIO', id_ref_audiencia: null, _id_nivel: '', _id_grado: '', fecha_programada: '' });
  const [sendingNotif, setSendingNotif] = useState(false);
  const [confirmDeleteNotif, setConfirmDeleteNotif] = useState(null);
  // Sitio Web tab state
  const [colegioForm, setColegioForm] = useState({ lema: '', descripcion: '', direccion: '', email: '', telefono: '', telefono_whatsapp: '' });
  const [savingColegio, setSavingColegio] = useState(false);
  // Niveles y Grados modals
  const [modalNivel, setModalNivel] = useState(false);
  const [nivelForm, setNivelForm] = useState({ nombre: '' });
  const [editNivelId, setEditNivelId] = useState(null);
  const [modalGrado, setModalGrado] = useState(false);
  const [gradoForm, setGradoForm] = useState({ id_nivel: '', nombre: '', orden: 0 });
  const [editGradoId, setEditGradoId] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [añosR, nivelesR, gradosR, aulasR, puntosR, tutoresR, pensionR, horariosR, plantillasR, configPensionR, mesesR, colegioR, notifPersR] = await Promise.all([
        listarAños(), listarNiveles(), listarGrados(), listarAulas(), listarPuntosEscaneo(),
        listarUsuarios({ rol: 'TUTOR' }),
        apiClient.get('/pensiones/plantilla').catch(() => ({ data: { data: [] } })),
        listarHorarios().catch(() => ({ data: { data: [] } })),
        apiClient.get('/notificaciones/plantillas').catch(() => ({ data: { data: [] } })),
        apiClient.get('/notificaciones/config-pension').catch(() => ({ data: { data: {} } })),
        apiClient.get('/config-escolar/meses').catch(() => ({ data: { data: [] } })),
        obtenerColegio().catch(() => ({ data: { data: {} } })),
        listarNotifPersonalizadas().catch(() => ({ data: { data: [] } })),
      ]);
      setAños(añosR.data.data || []);
      setNiveles(nivelesR.data.data || []);
      setGrados(gradosR.data.data || []);
      setAulas(aulasR.data.data || []);
      setPuntos(puntosR.data.data || []);
      setTutores(tutoresR.data.data || []);
      const pensionData = pensionR.data.data || [];
      const mesesData = mesesR.data.data || [];
      setPensionMeses(pensionData);
      setPlantillas(plantillasR.data.data || []);
      setNotifPersonalizadas(notifPersR.data.data || []);
      setCatalogoMeses(mesesData);

      // Construir pagosActivos desde la plantilla
      const pagos = pensionData.map(p => ({
        clave: p.clave,
        nombre: p.nombre,
        tipo: p.tipo || 'mes',
        comentario: p.comentario || '',
      }));
      setPagosActivos(pagos);
      const cp = configPensionR.data.data;
      if (cp && cp.id) setConfigPension({ dia_inicio: cp.dia_inicio, frecuencia_dias: cp.frecuencia_dias, activa: cp.activa });
      else setConfigPension(null);

      const horariosData = horariosR.data.data || [];
      setHorarios(horariosData);

      // Inicializar formularios de horarios con datos existentes
      const forms = {};
      const nivelesData = nivelesR.data.data || [];
      nivelesData.forEach(n => {
        const existente = horariosData.find(h => h.id_nivel === n.id);
        if (existente) {
          forms[n.id] = {
            hora_inicio: formatTimeFromDB(existente.hora_inicio),
            tolerancia_tardanza_min: existente.tolerancia_tardanza_min,
            hora_limite_no_ingreso: formatTimeFromDB(existente.hora_limite_no_ingreso),
          };
        } else {
          forms[n.id] = { hora_inicio: '07:30', tolerancia_tardanza_min: 15, hora_limite_no_ingreso: '08:30' };
        }
      });
      setHorarioForms(forms);

      const col = colegioR.data.data || {};
      setColegioForm({
        lema: col.lema || '', descripcion: col.descripcion || '',
        direccion: col.direccion || '', email: col.email || '',
        telefono: col.telefono || '', telefono_whatsapp: col.telefono_whatsapp || '',
      });
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeFromDB = (timeStr) => {
    if (!timeStr) return '07:30';
    try {
      const d = new Date(timeStr);
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    } catch {
      return '07:30';
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCrearAño = async (e) => {
    e.preventDefault();
    try {
      await crearAño({ anio: parseInt(añoForm.año), fecha_inicio: añoForm.fecha_inicio, fecha_fin: añoForm.fecha_fin });
      toast.success('Año escolar creado');
      setModalAño(false);
      setAñoForm({ año: new Date().getFullYear() + 1, fecha_inicio: '', fecha_fin: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear año escolar');
    }
  };

  const handleCrearNivel = async (e) => {
    e.preventDefault();
    try {
      if (editNivelId) {
        await actualizarNivel(editNivelId, { nombre: nivelForm.nombre.trim() });
        toast.success('Nivel actualizado');
      } else {
        await crearNivel({ nombre: nivelForm.nombre.trim() });
        toast.success('Nivel creado');
      }
      setModalNivel(false);
      setNivelForm({ nombre: '' });
      setEditNivelId(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || (editNivelId ? 'Error al actualizar nivel' : 'Error al crear nivel'));
    }
  };

  const handleCrearGrado = async (e) => {
    e.preventDefault();
    try {
      if (editGradoId) {
        await actualizarGrado(editGradoId, { id_nivel: gradoForm.id_nivel, nombre: gradoForm.nombre.trim(), orden: gradoForm.orden });
        toast.success('Grado actualizado');
      } else {
        await crearGrado({ id_nivel: gradoForm.id_nivel, nombre: gradoForm.nombre.trim(), orden: gradoForm.orden });
        toast.success('Grado creado');
      }
      setModalGrado(false);
      setGradoForm({ id_nivel: '', nombre: '', orden: 0 });
      setEditGradoId(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || (editGradoId ? 'Error al actualizar grado' : 'Error al crear grado'));
    }
  };

  const handleCrearAula = async (e) => {
    e.preventDefault();
    try {
      await crearAula(aulaForm);
      toast.success('Aula creada');
      setModalAula(false);
      setAulaForm({ id_anio_escolar: '', id_grado: '', seccion: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleAsignarTutor = async (e) => {
    e.preventDefault();
    try {
      await asignarTutor(tutorForm);
      toast.success('Tutor asignado');
      setModalTutor(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleGuardarPlantillaPension = async () => {
    if (pagosActivos.length === 0) {
      toast.error('Agregue al menos un pago');
      return;
    }
    const sinNombre = pagosActivos.find(p => p.tipo === 'personalizado' && !p.nombre.trim());
    if (sinNombre) {
      toast.error('Todos los pagos personalizados deben tener nombre');
      return;
    }

    setSavingPension(true);
    try {
      const meses = pagosActivos.map(p => ({ clave: p.clave, nombre: p.nombre, tipo: p.tipo, comentario: p.comentario?.trim() || '' }));
      await apiClient.post('/pensiones/plantilla', { meses });
      toast.success('Plantilla de pensión guardada');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setSavingPension(false);
    }
  };

  const handleGuardarHorario = async (nivel) => {
    const form = horarioForms[nivel.id];
    if (!form) return;

    const añoActivo = años.find(a => a.activo);
    if (!añoActivo) {
      toast.error('Debe tener un año escolar activo');
      return;
    }

    setSavingHorario(nivel.id);
    try {
      await guardarHorario({
        id_nivel: nivel.id,
        id_anio_escolar: añoActivo.id,
        hora_inicio: form.hora_inicio,
        tolerancia_tardanza_min: form.tolerancia_tardanza_min,
        hora_limite_no_ingreso: form.hora_limite_no_ingreso,
      });
      toast.success(`Horario de ${nivel.nombre} guardado`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar horario');
    } finally {
      setSavingHorario(null);
    }
  };

  const updateHorarioForm = (nivelId, field, value) => {
    setHorarioForms(prev => ({
      ...prev,
      [nivelId]: { ...prev[nivelId], [field]: value },
    }));
  };

  const handleGuardarPlantillaNotif = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/notificaciones/plantillas/${modalPlantilla.item.id}`, plantillaForm);
      toast.success('Plantilla actualizada');
      setModalPlantilla({ open: false, item: null });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar plantilla');
    }
  };

  const handleGuardarConfigPension = async () => {
    setSavingPensionConfig(true);
    try {
      await apiClient.put('/notificaciones/config-pension', configPension);
      toast.success('Configuración de recordatorio guardada');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSavingPensionConfig(false);
    }
  };

  const handleEnviarNotifPersonalizada = async (e) => {
    e.preventDefault();
    if (!notifForm.titulo.trim() || !notifForm.cuerpo.trim()) {
      toast.error('Título y cuerpo son obligatorios');
      return;
    }
    if (notifForm.tipo_audiencia !== 'COLEGIO' && !notifForm.id_ref_audiencia) {
      toast.error('Seleccione la audiencia destino');
      return;
    }

    setSendingNotif(true);
    try {
      const payload = {
        titulo: notifForm.titulo.trim(),
        cuerpo: notifForm.cuerpo.trim(),
        tipo_entrega: notifForm.tipo_entrega,
        tipo_audiencia: notifForm.tipo_audiencia,
        id_ref_audiencia: notifForm.tipo_audiencia !== 'COLEGIO' ? notifForm.id_ref_audiencia : null,
      };
      if (notifForm.fecha_programada) payload.fecha_programada = notifForm.fecha_programada;
      const { data } = await crearNotifPersonalizada(payload);
      if (data.data.programada_para) {
        toast.success(`Notificación programada para ${data.data.programada_para}`);
      } else {
        toast.success(`Notificación enviada a ${data.data.total_destinatarios} destinatarios`);
      }
      setNotifForm({ titulo: '', cuerpo: '', tipo_entrega: 'buzon', tipo_audiencia: 'COLEGIO', id_ref_audiencia: null, _id_nivel: '', _id_grado: '', fecha_programada: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar notificación');
    } finally {
      setSendingNotif(false);
    }
  };

  const handleEliminarNotifPersonalizada = async () => {
    if (!confirmDeleteNotif) return;
    try {
      await eliminarNotifPersonalizada(confirmDeleteNotif.id);
      toast.success('Notificación eliminada');
      setConfirmDeleteNotif(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
      setConfirmDeleteNotif(null);
    }
  };

  const handleGuardarColegio = async () => {
    setSavingColegio(true);
    try {
      await actualizarColegio(colegioForm);
      toast.success('Datos del sitio web actualizados');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSavingColegio(false);
    }
  };

  // Filtrar grados por nivel seleccionado en el form
  const gradosFiltrados = aulaForm._id_nivel
    ? grados.filter(g => g.nivel?.nombre === niveles.find(n => n.id === aulaForm._id_nivel)?.nombre || g.id_nivel === aulaForm._id_nivel)
    : grados;

  const tabs = [
    { key: 'niveles', label: 'Niveles y Grados' },
    { key: 'aulas', label: 'Aulas' },
    { key: 'horarios', label: 'Horarios' },
    { key: 'años', label: 'Años Escolares' },
    { key: 'puntos', label: 'Puntos Escaneo' },
    { key: 'pensiones', label: 'Plantilla Pensión' },
    { key: 'notificaciones', label: 'Notificaciones' },
    { key: 'notif-personalizadas', label: 'Notif. Personalizadas' },
    { key: 'sitio', label: 'Sitio Web' },
  ];

  const aulasColumns = [
    { header: '#', render: (_, i) => i + 1 },
    { header: 'Nivel', sortValue: (r) => r.grado?.nivel?.nombre || '', render: (r) => r.grado?.nivel?.nombre || '-' },
    { header: 'Grado', sortValue: (r) => r.grado?.nombre || '', render: (r) => r.grado?.nombre || '-' },
    { header: 'Sección', accessor: 'seccion' },
    { header: 'Alumnos', sortValue: (r) => r.total_alumnos || 0, render: (r) => r.total_alumnos || 0 },
    { header: 'Tutor', sortValue: (r) => r.asignacion_tutor?.[0]?.tutor?.nombres || '', render: (r) => r.asignacion_tutor?.[0]?.tutor?.nombres || 'Sin asignar' },
    { header: 'Acciones', render: (r) => (
      <button onClick={() => navigate(`/aula/${r.id}`)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gold-700 bg-gold-50 rounded-lg hover:bg-gold-100 border border-gold-200 transition-colors">
        <HiEye className="w-3.5 h-3.5" /> Ver
      </button>
    )},
  ];

  return (
    <div>
      <h1 className="page-title mb-6">Configuración Escolar</h1>

      <div className="flex gap-1 mb-6 bg-cream-100 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white text-primary-800 shadow-sm' : 'text-primary-800/70 hover:text-primary-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'niveles' && (
        <Card title="Niveles y Grados" actions={
          <div className="flex gap-2">
            <button onClick={() => { setEditGradoId(null); setGradoForm({ id_nivel: '', nombre: '', orden: 0 }); setModalGrado(true); }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              disabled={niveles.length === 0}>
              <HiPlus className="w-4 h-4" /> Nuevo Grado
            </button>
            <button onClick={() => { setEditNivelId(null); setNivelForm({ nombre: '' }); setModalNivel(true); }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm">
              <HiPlus className="w-4 h-4" /> Nuevo Nivel
            </button>
          </div>
        }>
          <p className="text-sm text-gold-600 mb-6">
            Los niveles y grados se configuran una sola vez y se reutilizan en todos los años escolares. Luego, en la pestaña "Aulas", cree las secciones para cada año.
          </p>
          {niveles.length === 0 ? (
            <p className="text-center py-8 text-cream-400">No hay niveles registrados. Cree el primer nivel para comenzar.</p>
          ) : (
            <div className="space-y-4">
              {niveles.map(nivel => (
                <div key={nivel.id} className="p-4 rounded-lg border border-cream-200 bg-cream-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-primary-800 font-display text-lg">{nivel.nombre}</h4>
                      <button onClick={() => { setEditNivelId(nivel.id); setNivelForm({ nombre: nivel.nombre }); setModalNivel(true); }}
                        className="p-1 text-cream-400 hover:text-gold-600 transition-colors" title="Editar nivel">
                        <HiPencil className="w-4 h-4" />
                      </button>
                    </div>
                    <Badge variant="default">{(nivel.grados || []).length} grado(s)</Badge>
                  </div>
                  {(nivel.grados || []).length === 0 ? (
                    <p className="text-sm text-cream-400 italic">Sin grados. Agregue grados a este nivel.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(nivel.grados || []).map(grado => (
                        <button key={grado.id} type="button"
                          onClick={() => { setEditGradoId(grado.id); setGradoForm({ id_nivel: nivel.id, nombre: grado.nombre, orden: grado.orden }); setModalGrado(true); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-cream-200 rounded-lg text-primary-800 hover:border-gold-400 hover:shadow-sm transition-all cursor-pointer group">
                          <span className="text-xs text-cream-400 font-mono">#{grado.orden}</span>
                          {grado.nombre}
                          <HiPencil className="w-3 h-3 text-cream-300 group-hover:text-gold-600 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'aulas' && (
        <Card title="Aulas" actions={
          <div className="flex gap-2">
            <button onClick={() => setModalTutor(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              Asignar Tutor
            </button>
            <button onClick={() => { setAulaForm({ id_anio_escolar: '', id_grado: '', seccion: '', _id_nivel: '' }); setModalAula(true); }} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm">
              <HiPlus className="w-4 h-4" /> Nueva Aula
            </button>
          </div>
        }>
          <DataTable columns={aulasColumns} data={aulas} loading={loading} />
        </Card>
      )}

      {tab === 'horarios' && (
        <Card title="Horarios por Nivel">
          <p className="text-sm text-gold-600 mb-6">
            Configure la hora de inicio, tolerancia de tardanza y hora límite de ingreso para cada nivel educativo. Esta configuración aplica a todas las aulas del nivel.
          </p>
          {niveles.length === 0 ? (
            <p className="text-center py-8 text-cream-400">No hay niveles registrados. Cree los niveles primero.</p>
          ) : (
            <div className="space-y-6">
              {niveles.map(nivel => {
                const form = horarioForms[nivel.id] || { hora_inicio: '07:30', tolerancia_tardanza_min: 15, hora_limite_no_ingreso: '08:30' };
                const existente = horarios.find(h => h.id_nivel === nivel.id);
                return (
                  <div key={nivel.id} className="p-4 rounded-lg border border-cream-200 bg-cream-50/50">
                    <div className="flex items-center gap-2 mb-4">
                      <HiClock className="w-5 h-5 text-gold-600" />
                      <h4 className="font-semibold text-primary-800 font-display">{nivel.nombre}</h4>
                      {existente && <Badge variant="success">Configurado</Badge>}
                      {!existente && <Badge variant="warning">Pendiente</Badge>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary-800/80 mb-1">Hora de Inicio</label>
                        <input type="time" value={form.hora_inicio}
                          onChange={(e) => updateHorarioForm(nivel.id, 'hora_inicio', e.target.value)}
                          className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary-800/80 mb-1">Tolerancia Tardanza (min)</label>
                        <input type="number" min="0" max="60" value={form.tolerancia_tardanza_min}
                          onChange={(e) => updateHorarioForm(nivel.id, 'tolerancia_tardanza_min', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary-800/80 mb-1">Hora Límite de Ingreso</label>
                        <input type="time" value={form.hora_limite_no_ingreso}
                          onChange={(e) => updateHorarioForm(nivel.id, 'hora_limite_no_ingreso', e.target.value)}
                          className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button onClick={() => handleGuardarHorario(nivel)} disabled={savingHorario === nivel.id}
                        className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                        {savingHorario === nivel.id ? 'Guardando...' : (existente ? 'Actualizar' : 'Guardar')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === 'años' && (
        <Card title="Años Escolares" actions={
          <button onClick={() => { setAñoForm({ año: new Date().getFullYear() + 1, fecha_inicio: '', fecha_fin: '' }); setModalAño(true); }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm">
            <HiPlus className="w-4 h-4" /> Nuevo Año Escolar
          </button>
        }>
          <DataTable columns={[
            { header: 'ID', accessor: 'id' },
            { header: 'Año', accessor: 'anio' },
            { header: 'Inicio', render: (r) => formatFecha(r.fecha_inicio) },
            { header: 'Fin', render: (r) => formatFecha(r.fecha_fin) },
            { header: 'Activo', render: (r) => (
              <Badge variant={r.activo ? 'success' : 'default'}>{r.activo ? 'Sí' : 'No'}</Badge>
            )},
            { header: 'Acciones', render: (r) => (
              <div className="flex gap-2">
                {!r.activo && (
                  <button onClick={async () => { await activarAño(r.id); fetchAll(); toast.success('Año activado'); }}
                    className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Activar</button>
                )}
                {r.activo && (
                  <Badge variant="success">Activo</Badge>
                )}
              </div>
            )},
          ]} data={años} loading={loading} />
        </Card>
      )}

      {tab === 'puntos' && (
        <Card title="Puntos de Escaneo">
          <DataTable columns={[
            { header: 'ID', accessor: 'id' },
            { header: 'Nombre', accessor: 'nombre' },
            { header: 'Ubicación', accessor: 'ubicacion' },
          ]} data={puntos} loading={loading} />
        </Card>
      )}

      {tab === 'pensiones' && (
        <PensionTab
          catalogoMeses={catalogoMeses}
          pagosActivos={pagosActivos}
          setPagosActivos={setPagosActivos}
          pensionMeses={pensionMeses}
          savingPension={savingPension}
          onGuardar={handleGuardarPlantillaPension}
        />
      )}

      {tab === 'notificaciones' && (
        <div className="space-y-6">
          <Card title="Plantillas de Notificación" actions={
            <div className="flex items-center gap-2">
              <HiBell className="w-5 h-5 text-gold-600" />
            </div>
          }>
            <p className="text-sm text-gold-600 mb-4">
              Configure el contenido, estado y tipo de entrega de cada notificación del sistema.
            </p>
            <DataTable columns={[
              { header: 'Código', accessor: 'codigo' },
              { header: 'Título', accessor: 'titulo' },
              { header: 'Estado', render: (r) => <Badge variant={r.habilitada ? 'success' : 'danger'}>{r.habilitada ? 'Activa' : 'Inactiva'}</Badge> },
              { header: 'Entrega', render: (r) => {
                const labels = { buzon: 'Buzón', modal: 'Modal', ambos: 'Ambos' };
                const variants = { buzon: 'default', modal: 'warning', ambos: 'info' };
                return <Badge variant={variants[r.tipo_entrega] || 'default'}>{labels[r.tipo_entrega] || r.tipo_entrega || 'Buzón'}</Badge>;
              }},
              { header: 'Destinatarios', render: (r) => {
                const roles = Array.isArray(r.roles_destino) ? r.roles_destino : [];
                return roles.join(', ') || '-';
              }},
              { header: 'Acciones', render: (r) => (
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    setPlantillaForm({ titulo: r.titulo, cuerpo: r.cuerpo, habilitada: r.habilitada, tipo_entrega: r.tipo_entrega || 'buzon' });
                    setModalPlantilla({ open: true, item: r });
                  }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gold-700 bg-gold-50 rounded-lg hover:bg-gold-100 border border-gold-200 transition-colors">
                    <HiPencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 rounded-full whitespace-nowrap">
                    <HiExclamation className="w-2.5 h-2.5" /> no tocar
                  </span>
                </div>
              )},
            ]} data={plantillas} loading={loading} />
          </Card>

          <Card title="Configuración de Recordatorio de Pensión">
            <p className="text-sm text-gold-600 mb-4">
              Define desde qué día del mes se muestra el recordatorio a los padres y cada cuántos días se repite.
            </p>
            {!configPension ? (
              <p className="text-center py-6 text-cream-400">Cargando configuración...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-800/80 mb-1">Día de Inicio (1-28)</label>
                    <input type="number" min="1" max="28" value={configPension.dia_inicio ?? ''}
                      onChange={(e) => setConfigPension(prev => ({ ...prev, dia_inicio: parseInt(e.target.value) || '' }))}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
                    <p className="text-xs text-cream-400 mt-1">El recordatorio aparece a partir de este día cada mes</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-800/80 mb-1">Frecuencia (días)</label>
                    <input type="number" min="1" max="30" value={configPension.frecuencia_dias ?? ''}
                      onChange={(e) => setConfigPension(prev => ({ ...prev, frecuencia_dias: parseInt(e.target.value) || '' }))}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
                    <p className="text-xs text-cream-400 mt-1">Se muestra cada N días después del día de inicio</p>
                  </div>
                  <div className="flex items-start gap-3 pt-6">
                    <button type="button" onClick={() => setConfigPension(prev => ({ ...prev, activa: !prev.activa }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${configPension.activa ? 'bg-primary-600' : 'bg-cream-300'}`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${configPension.activa ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-sm font-medium text-primary-800/80">{configPension.activa ? 'Habilitado' : 'Deshabilitado'}</span>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button onClick={handleGuardarConfigPension} disabled={savingPensionConfig}
                    className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                    {savingPensionConfig ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'notif-personalizadas' && (
        <div className="space-y-6">
          <Card title="Nueva Notificación" actions={
            <HiSpeakerphone className="w-5 h-5 text-gold-600" />
          }>
            <p className="text-sm text-gold-600 mb-4">
              Envíe notificaciones personalizadas a los usuarios del sistema. Elija el tipo de entrega y la audiencia destino.
            </p>
            <form onSubmit={handleEnviarNotifPersonalizada} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-800/80 mb-1">Título</label>
                <input type="text" value={notifForm.titulo} maxLength={200}
                  onChange={(e) => setNotifForm({ ...notifForm, titulo: e.target.value })} required
                  placeholder="Ej: Cambio de horario"
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-800/80 mb-1">Mensaje</label>
                <textarea value={notifForm.cuerpo} rows={4}
                  onChange={(e) => setNotifForm({ ...notifForm, cuerpo: e.target.value })} required
                  placeholder="Escriba el contenido de la notificación..."
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors resize-y" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-800/80 mb-1">Tipo de Entrega</label>
                  <select value={notifForm.tipo_entrega}
                    onChange={(e) => setNotifForm({ ...notifForm, tipo_entrega: e.target.value })}
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors">
                    <option value="buzon">Buzón (solo campana)</option>
                    <option value="modal">Modal (pantalla completa al abrir app)</option>
                    <option value="ambos">Ambos (buzón + modal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-800/80 mb-1">Audiencia</label>
                  <select value={notifForm.tipo_audiencia}
                    onChange={(e) => setNotifForm({ ...notifForm, tipo_audiencia: e.target.value, id_ref_audiencia: null, _id_nivel: '', _id_grado: '' })}
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors">
                    <option value="COLEGIO">Todo el Colegio</option>
                    <option value="NIVEL">Por Nivel</option>
                    <option value="GRADO">Por Grado</option>
                    <option value="AULA">Por Aula</option>
                  </select>
                </div>
              </div>

              {/* Selectores en cascada según audiencia */}
              {notifForm.tipo_audiencia === 'NIVEL' && (
                <div>
                  <label className="block text-sm font-medium text-primary-800/80 mb-1">Nivel</label>
                  <select value={notifForm.id_ref_audiencia || ''}
                    onChange={(e) => setNotifForm({ ...notifForm, id_ref_audiencia: parseInt(e.target.value) || null })} required
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors">
                    <option value="">Seleccione...</option>
                    {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  </select>
                </div>
              )}

              {notifForm.tipo_audiencia === 'GRADO' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-800/80 mb-1">Nivel</label>
                    <select value={notifForm._id_nivel || ''}
                      onChange={(e) => setNotifForm({ ...notifForm, _id_nivel: parseInt(e.target.value) || '', _id_grado: '', id_ref_audiencia: null })} required
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors">
                      <option value="">Seleccione...</option>
                      {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-800/80 mb-1">Grado</label>
                    <select value={notifForm.id_ref_audiencia || ''}
                      onChange={(e) => setNotifForm({ ...notifForm, id_ref_audiencia: parseInt(e.target.value) || null })} required
                      disabled={!notifForm._id_nivel}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors disabled:bg-cream-50 disabled:text-cream-400">
                      <option value="">{notifForm._id_nivel ? 'Seleccione...' : 'Seleccione nivel primero'}</option>
                      {grados.filter(g => g.id_nivel === notifForm._id_nivel || g.nivel?.id === notifForm._id_nivel).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {notifForm.tipo_audiencia === 'AULA' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-800/80 mb-1">Nivel</label>
                    <select value={notifForm._id_nivel || ''}
                      onChange={(e) => setNotifForm({ ...notifForm, _id_nivel: parseInt(e.target.value) || '', _id_grado: '', id_ref_audiencia: null })} required
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors">
                      <option value="">Seleccione...</option>
                      {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-800/80 mb-1">Grado</label>
                    <select value={notifForm._id_grado || ''}
                      onChange={(e) => setNotifForm({ ...notifForm, _id_grado: parseInt(e.target.value) || '', id_ref_audiencia: null })} required
                      disabled={!notifForm._id_nivel}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors disabled:bg-cream-50 disabled:text-cream-400">
                      <option value="">{notifForm._id_nivel ? 'Seleccione...' : 'Seleccione nivel primero'}</option>
                      {grados.filter(g => g.id_nivel === notifForm._id_nivel || g.nivel?.id === notifForm._id_nivel).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-800/80 mb-1">Aula</label>
                    <select value={notifForm.id_ref_audiencia || ''}
                      onChange={(e) => setNotifForm({ ...notifForm, id_ref_audiencia: parseInt(e.target.value) || null })} required
                      disabled={!notifForm._id_grado}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors disabled:bg-cream-50 disabled:text-cream-400">
                      <option value="">{notifForm._id_grado ? 'Seleccione...' : 'Seleccione grado primero'}</option>
                      {aulas.filter(a => a.grado?.id === notifForm._id_grado || a.id_grado === notifForm._id_grado).map(a => (
                        <option key={a.id} value={a.id}>{a.grado?.nombre} "{a.seccion}"</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-primary-800/80 mb-1">Programar envío (opcional)</label>
                <input type="date" value={notifForm.fecha_programada}
                  onChange={(e) => setNotifForm({ ...notifForm, fecha_programada: e.target.value })}
                  min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                  className="w-full sm:w-auto px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
                <p className="text-xs text-cream-400 mt-1">Déjelo vacío para envío inmediato. Si elige una fecha futura, se enviará automáticamente a las 8:00 AM.</p>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={sendingNotif}
                  className={`px-5 py-2.5 text-sm text-white rounded-lg disabled:opacity-50 transition-colors ${notifForm.fecha_programada ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary-600 hover:bg-primary-700'}`}>
                  {sendingNotif ? (notifForm.fecha_programada ? 'Programando...' : 'Enviando...') : (notifForm.fecha_programada ? 'Programar Notificación' : 'Enviar Notificación')}
                </button>
              </div>
            </form>
          </Card>

          <Card title="Historial de Notificaciones">
            <DataTable columns={[
              { header: 'Título', render: (r) => (
                <div className="max-w-[200px]">
                  <p className={`text-sm font-medium truncate ${!r.activa ? 'line-through text-cream-400' : 'text-primary-800'}`}>{r.titulo}</p>
                </div>
              )},
              { header: 'Estado', render: (r) => {
                if (!r.activa) return <Badge variant="danger">Eliminada</Badge>;
                if (r.estado === 'PROGRAMADA') return (
                  <div className="text-center">
                    <Badge variant="warning">Programada</Badge>
                    {r.fecha_programada && <p className="text-[10px] text-amber-600 mt-0.5">{formatFecha(r.fecha_programada)}</p>}
                  </div>
                );
                return <Badge variant="success">Enviada</Badge>;
              }},
              { header: 'Entrega', render: (r) => {
                const labels = { buzon: 'Buzón', modal: 'Modal', ambos: 'Ambos' };
                const variants = { buzon: 'default', modal: 'warning', ambos: 'info' };
                return <Badge variant={variants[r.tipo_entrega] || 'default'}>{labels[r.tipo_entrega] || r.tipo_entrega}</Badge>;
              }},
              { header: 'Audiencia', render: (r) => (
                <span className="text-sm text-primary-800/80">{r.nombre_audiencia}</span>
              )},
              { header: 'Dest.', render: (r) => r.total_destinatarios },
              { header: 'Leídas', render: (r) => {
                if (!['buzon', 'ambos'].includes(r.tipo_entrega)) return <span className="text-cream-400">-</span>;
                if (r.estado === 'PROGRAMADA') return <span className="text-cream-400">-</span>;
                return <span className="text-sm">{r.total_leidas_buzon}/{r.total_destinatarios}</span>;
              }},
              { header: 'Modal', render: (r) => {
                if (!['modal', 'ambos'].includes(r.tipo_entrega)) return <span className="text-cream-400">-</span>;
                if (r.estado === 'PROGRAMADA') return <span className="text-cream-400">-</span>;
                return <span className="text-sm">{r.total_aceptadas_modal}/{r.total_destinatarios}</span>;
              }},
              { header: 'Creada', render: (r) => <span className="text-xs text-cream-500">{formatFechaHora(r.date_time_registration)}</span> },
              { header: '', render: (r) => r.activa && (
                <button onClick={() => setConfirmDeleteNotif(r)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                  <HiTrash className="w-3.5 h-3.5" /> Eliminar
                </button>
              )},
            ]} data={notifPersonalizadas} loading={loading} />
          </Card>
        </div>
      )}

      {tab === 'sitio' && (
        <Card title="Datos del Sitio Web" actions={
          <div className="flex items-center gap-2">
            <HiGlobe className="w-5 h-5 text-gold-600" />
          </div>
        }>
          <p className="text-sm text-gold-600 mb-6">
            Configure la información que se muestra en la página de inicio pública del colegio.
          </p>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Lema / Eslogan</label>
              <input type="text" value={colegioForm.lema} maxLength={300}
                onChange={(e) => setColegioForm({ ...colegioForm, lema: e.target.value })}
                placeholder="Ej: Formando líderes con valores para el futuro"
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
              <p className="text-xs text-cream-400 mt-1">Se muestra como subtítulo principal en la página de inicio</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Descripción</label>
              <textarea value={colegioForm.descripcion} rows={3} maxLength={1000}
                onChange={(e) => setColegioForm({ ...colegioForm, descripcion: e.target.value })}
                placeholder="Breve descripción de la institución educativa..."
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors resize-y" />
              <p className="text-xs text-cream-400 mt-1">Párrafo descriptivo que aparece debajo del lema</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-800/80 mb-1">Dirección</label>
                <input type="text" value={colegioForm.direccion} maxLength={300}
                  onChange={(e) => setColegioForm({ ...colegioForm, direccion: e.target.value })}
                  placeholder="Av. Principal 123, Lima, Perú"
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-800/80 mb-1">Correo Electrónico</label>
                <input type="email" value={colegioForm.email} maxLength={100}
                  onChange={(e) => setColegioForm({ ...colegioForm, email: e.target.value })}
                  placeholder="info@colegio.edu.pe"
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-800/80 mb-1">Teléfono General</label>
                <input type="text" value={colegioForm.telefono} maxLength={20}
                  onChange={(e) => setColegioForm({ ...colegioForm, telefono: e.target.value })}
                  placeholder="(01) 234-5678"
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-800/80 mb-1">WhatsApp</label>
                <input type="text" value={colegioForm.telefono_whatsapp} maxLength={20}
                  onChange={(e) => setColegioForm({ ...colegioForm, telefono_whatsapp: e.target.value.replace(/\D/g, '') })}
                  placeholder="51987654321"
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
                <p className="text-xs text-cream-400 mt-1">Código de país sin +, ej: 51987654321</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={handleGuardarColegio} disabled={savingColegio}
                className="px-5 py-2.5 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {savingColegio ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Modal Editar Plantilla Notificacion */}
      <Modal isOpen={modalPlantilla.open} onClose={() => setModalPlantilla({ open: false, item: null })}
        title={`Editar Plantilla: ${modalPlantilla.item?.codigo || ''}`} size="lg">
        <form onSubmit={handleGuardarPlantillaNotif} className="space-y-4">
          {/* Burbuja instructiva */}
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
            <HiInformationCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">
              Los campos marcados con <span className="inline-flex items-center font-bold text-red-600">NO TOCAR</span> son críticos para el funcionamiento de las notificaciones.
              Solo edítelos si comprende su impacto: cambiar el título puede confundir a los destinatarios, y eliminar variables del cuerpo <span className="font-mono text-red-800">{'{{}}'}</span> causará que la notificación salga incompleta.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-primary-800/80">Título</label>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white bg-red-600 rounded">
                <HiExclamation className="w-3 h-3" /> No tocar
              </span>
            </div>
            <input type="text" value={plantillaForm.titulo}
              onChange={(e) => setPlantillaForm({...plantillaForm, titulo: e.target.value})} required
              className="w-full px-3 py-2 border border-red-300 rounded-lg outline-none focus:border-red-400 transition-colors ring-1 ring-red-200" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-primary-800/80">Cuerpo del Mensaje</label>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white bg-red-600 rounded">
                <HiExclamation className="w-3 h-3" /> No tocar
              </span>
            </div>
            <textarea value={plantillaForm.cuerpo}
              onChange={(e) => setPlantillaForm({...plantillaForm, cuerpo: e.target.value})}
              rows={4} required
              className="w-full px-3 py-2 border border-red-300 rounded-lg outline-none focus:border-red-400 transition-colors resize-y ring-1 ring-red-200" />
            <p className="text-xs text-cream-400 mt-1">
              Variables disponibles: {'{{alumno}}'}, {'{{fecha}}'}, {'{{hora}}'}, {'{{mes}}'}, {'{{aula}}'}, {'{{titulo}}'}, {'{{asunto}}'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Tipo de Entrega</label>
            <select value={plantillaForm.tipo_entrega}
              onChange={(e) => setPlantillaForm({...plantillaForm, tipo_entrega: e.target.value})}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors">
              <option value="buzon">Buzón (solo campana)</option>
              {modalPlantilla.item?.codigo === 'PENSION_25_30' && (
                <>
                  <option value="modal">Modal (pantalla completa al abrir app)</option>
                  <option value="ambos">Ambos (buzón + modal)</option>
                </>
              )}
            </select>
            {modalPlantilla.item?.codigo !== 'PENSION_25_30' && (
              <p className="text-xs text-cream-400 mt-1">La opción de modal solo está disponible para recordatorios de pensión</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setPlantillaForm({...plantillaForm, habilitada: !plantillaForm.habilitada})}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${plantillaForm.habilitada ? 'bg-primary-600' : 'bg-cream-300'}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${plantillaForm.habilitada ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-primary-800/80">Plantilla {plantillaForm.habilitada ? 'habilitada' : 'deshabilitada'}</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalPlantilla({ open: false, item: null })}
              className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Nuevo Año Escolar */}
      <Modal isOpen={modalAño} onClose={() => setModalAño(false)} title="Nuevo Año Escolar">
        <form onSubmit={handleCrearAño} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Año</label>
            <input type="number" min="2020" max="2099" value={añoForm.año}
              onChange={(e) => setAñoForm({ ...añoForm, año: e.target.value })} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Fecha de Inicio</label>
            <input type="date" value={añoForm.fecha_inicio}
              onChange={(e) => setAñoForm({ ...añoForm, fecha_inicio: e.target.value })} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Fecha de Fin</label>
            <input type="date" value={añoForm.fecha_fin}
              onChange={(e) => setAñoForm({ ...añoForm, fecha_fin: e.target.value })} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalAño(false)}
              className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit"
              className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Crear</button>
          </div>
        </form>
      </Modal>

      {/* Modal Nueva Aula */}
      <Modal isOpen={modalAula} onClose={() => setModalAula(false)} title="Nueva Aula">
        <form onSubmit={handleCrearAula} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Año Escolar</label>
            <select value={aulaForm.id_anio_escolar} onChange={(e) => setAulaForm({...aulaForm, id_anio_escolar: parseInt(e.target.value)})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors">
              <option value="">Seleccione...</option>
              {años.map(a => <option key={a.id} value={a.id}>{a.anio}{a.activo ? ' (Activo)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Nivel</label>
            <select value={aulaForm._id_nivel || ''} onChange={(e) => setAulaForm({...aulaForm, _id_nivel: parseInt(e.target.value) || '', id_grado: ''})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors">
              <option value="">Seleccione...</option>
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Grado</label>
            <select value={aulaForm.id_grado} onChange={(e) => setAulaForm({...aulaForm, id_grado: parseInt(e.target.value)})} required
              disabled={!aulaForm._id_nivel}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors disabled:bg-cream-50 disabled:text-cream-400">
              <option value="">{aulaForm._id_nivel ? 'Seleccione...' : 'Seleccione nivel primero'}</option>
              {grados.filter(g => {
                if (!aulaForm._id_nivel) return false;
                return g.id_nivel === aulaForm._id_nivel || g.nivel?.id === aulaForm._id_nivel;
              }).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Sección</label>
            <input type="text" value={aulaForm.seccion} onChange={(e) => setAulaForm({...aulaForm, seccion: e.target.value.toUpperCase()})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" placeholder="A" maxLength={5} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalAula(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Crear</button>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Tutor */}
      <Modal isOpen={modalTutor} onClose={() => setModalTutor(false)} title="Asignar Tutor" size="sm">
        <form onSubmit={handleAsignarTutor} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Aula</label>
            <select value={tutorForm.id_aula} onChange={(e) => setTutorForm({...tutorForm, id_aula: parseInt(e.target.value)})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
              <option value="">Seleccione...</option>
              {aulas.map(a => <option key={a.id} value={a.id}>{a.grado?.nombre} {a.seccion} - {a.grado?.nivel?.nombre || ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Tutor</label>
            <select value={tutorForm.id_usuario_tutor} onChange={(e) => setTutorForm({...tutorForm, id_usuario_tutor: parseInt(e.target.value)})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
              <option value="">Seleccione...</option>
              {tutores.map(t => <option key={t.id} value={t.id}>{t.nombres}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalTutor(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Asignar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Nuevo/Editar Nivel */}
      <Modal isOpen={modalNivel} onClose={() => { setModalNivel(false); setEditNivelId(null); }} title={editNivelId ? 'Editar Nivel' : 'Nuevo Nivel'} size="sm">
        <form onSubmit={handleCrearNivel} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Nombre del Nivel</label>
            <input type="text" value={nivelForm.nombre}
              onChange={(e) => setNivelForm({ nombre: e.target.value })} required maxLength={50}
              placeholder='Ej: "Inicial", "Primaria", "Secundaria"'
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setModalNivel(false); setEditNivelId(null); }}
              className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit"
              className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">{editNivelId ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Nuevo/Editar Grado */}
      <Modal isOpen={modalGrado} onClose={() => { setModalGrado(false); setEditGradoId(null); }} title={editGradoId ? 'Editar Grado' : 'Nuevo Grado'} size="sm">
        <form onSubmit={handleCrearGrado} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Nivel</label>
            <select value={gradoForm.id_nivel}
              onChange={(e) => setGradoForm({ ...gradoForm, id_nivel: parseInt(e.target.value) })} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors">
              <option value="">Seleccione nivel...</option>
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Nombre del Grado</label>
            <input type="text" value={gradoForm.nombre}
              onChange={(e) => setGradoForm({ ...gradoForm, nombre: e.target.value })} required maxLength={50}
              placeholder='Ej: "1er Grado", "2do Grado"'
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Orden</label>
            <input type="number" min="0" max="99" value={gradoForm.orden}
              onChange={(e) => setGradoForm({ ...gradoForm, orden: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 transition-colors" />
            <p className="text-xs text-cream-400 mt-1">Define el orden de aparición dentro del nivel (menor = primero)</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setModalGrado(false); setEditGradoId(null); }}
              className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit"
              className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">{editGradoId ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      {/* Confirm eliminar notificación personalizada */}
      <ConfirmDialog
        isOpen={!!confirmDeleteNotif}
        onClose={() => setConfirmDeleteNotif(null)}
        onConfirm={handleEliminarNotifPersonalizada}
        title="Eliminar Notificación"
        message={`¿Está seguro de eliminar la notificación "${confirmDeleteNotif?.titulo}"? Los modales pendientes dejarán de mostrarse, pero las notificaciones de buzón permanecerán como historial.`}
        confirmText="Eliminar"
        variant="danger"
      />

    </div>
  );
};

export default ConfigEscolar;

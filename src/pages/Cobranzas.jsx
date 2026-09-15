import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiChatAlt2, HiDeviceMobile, HiRefresh, HiCalendar, HiExternalLink, HiSearch, HiX, HiCheckCircle } from 'react-icons/hi';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { normalizeSearchText } from '../utils/textSearch';
import {
  actualizarEstadoMensaje,
  listarCandidatosCobranza,
  prepararMensajesCobranza,
  registrarCompromisoPago,
} from '../services/cobranzasService';

const moneda = (value) => `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
const modeloMensaje = (envio) => {
  if (!envio) return '';
  const conceptos = envio.conceptos.map(x => `${x.concepto || x.clave_mes}: S/${Number(x.saldo).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
  return envio.mensaje
    .replace(conceptos.join('\n'), '[DETALLE DE DEUDA]')
    .replace(conceptos.join(', '), '[DETALLE DE DEUDA]')
    .replaceAll(envio.alumno, '[NOMBRE DEL ESTUDIANTE]')
    .replace(/Total( pendiente)?:? S\/\d+(?:[.,]\d+)*/, (_, pendiente) => `Total${pendiente || ''}: S/[TOTAL PENDIENTE]`);
};
const motivo = {
  COMPROMISO_VIGENTE: 'Compromiso vigente',
  SIN_APODERADO: 'Sin apoderado',
  TELEFONO_INVALIDO: 'Teléfono inválido',
  SIN_DEUDA: 'Sin deuda',
  NO_VENCIDO: 'Aún no vencido',
};

export default function Cobranzas() {
  const [candidatos, setCandidatos] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [canal, setCanal] = useState('WHATSAPP');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [cola, setCola] = useState([]);
  const [compromiso, setCompromiso] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [envioAbiertoId, setEnvioAbiertoId] = useState(null);
  const [dialogo, setDialogo] = useState(null);
  const copiarMensaje = async (texto) => {
    try { await navigator.clipboard.writeText(texto); toast.success('Mensaje copiado'); }
    catch { toast.error('No se pudo copiar. Selecciona el texto y cópialo manualmente.'); }
  };
  const niveles = [
    { nivel: 1, nombre: 'Recordatorio', descripcion: 'Mensaje cordial actual.', color: 'border-emerald-300 bg-emerald-50 text-emerald-900', icono: '🟢' },
    { nivel: 2, nombre: 'Segundo aviso', descripcion: 'Seguimiento con un tono más firme.', color: 'border-amber-300 bg-amber-50 text-amber-900', icono: '🟡' },
    { nivel: 3, nombre: 'Citación obligatoria', descripcion: 'Solicita la presencia del apoderado en el colegio.', color: 'border-orange-300 bg-orange-50 text-orange-900', icono: '🟠' },
    { nivel: 4, nombre: 'Último aviso', descripcion: 'Regularización inmediata y atención prioritaria.', color: 'border-red-300 bg-red-50 text-red-900', icono: '🔴' },
  ];
  const iniciarPreparacion = () => setDialogo({ paso: 'TIPO', canal, ids: [...seleccionados], nivel: 1, mensajes: [] });
  const revisarNivel = async (nivel) => {
    setProcesando(true);
    try {
      const { data } = await prepararMensajesCobranza(dialogo.canal, dialogo.ids, { nivel, vista_previa: true });
      setDialogo({ ...dialogo, paso: 'PREVIA', nivel, mensajes: data.data?.preparados || [], omitidos: data.data?.omitidos?.length || 0 });
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo obtener la vista previa'); }
    finally { setProcesando(false); }
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await listarCandidatosCobranza();
      setCandidatos(data.data || []);
      setSeleccionados(new Set());
      setCola([]);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cargar la lista de cobranza');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const elegibles = useMemo(() => candidatos.filter((x) => x.elegible), [candidatos]);
  const alumnos = useMemo(() => {
    const grupos = new Map();
    candidatos.forEach((item) => {
      const grupo = grupos.get(item.id_alumno) || { id_alumno: item.id_alumno, codigo_alumno: item.codigo_alumno, alumno: item.alumno, apoderado: item.apoderado, telefono: item.telefono, conceptos: [] };
      grupo.conceptos.push(item);
      grupos.set(item.id_alumno, grupo);
    });
    return [...grupos.values()].map((grupo) => ({ ...grupo, conceptos: grupo.conceptos.sort((a, b) => (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || '')) })).sort((a, b) => a.alumno.localeCompare(b.alumno, 'es'));
  }, [candidatos]);
  const alumnosFiltrados = useMemo(() => {
    const texto = normalizeSearchText(busqueda);
    if (!texto) return alumnos;
    return alumnos.filter((grupo) => [grupo.codigo_alumno, grupo.alumno, grupo.apoderado, grupo.telefono].some((valor) => normalizeSearchText(valor).includes(texto)));
  }, [alumnos, busqueda]);
  const total = useMemo(() => candidatos.filter((x) => seleccionados.has(x.id_estado_pension)).reduce((s, x) => s + Number(x.saldo), 0), [candidatos, seleccionados]);
  const todasLasDeudasSeleccionadas = elegibles.length > 0 && elegibles.every((x) => seleccionados.has(x.id_estado_pension));

  const alternar = (id) => setSeleccionados((actual) => {
    const siguiente = new Set(actual);
    if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
    return siguiente;
  });

  const alternarTodasLasDeudas = () => setSeleccionados(todasLasDeudasSeleccionadas
    ? new Set()
    : new Set(elegibles.map((x) => x.id_estado_pension)));

  const preparar = async () => {
    if (!seleccionados.size) return toast.error('Selecciona al menos una deuda');
    setProcesando(true);
    try {
      const { data } = await prepararMensajesCobranza(dialogo.canal, dialogo.ids, { nivel: dialogo.nivel, revisados: dialogo.mensajes.map(({ id_alumno, mensaje }) => ({ id_alumno, mensaje })) });
      setCola(data.data?.preparados || []);
      setDialogo(null);
      toast.success(`${data.data?.preparados?.length || 0} mensaje(s) preparados. Revísalos antes de abrirlos.`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudieron preparar los mensajes');
    } finally {
      setProcesando(false);
    }
  };

  const obtenerDatosWhatsApp = (envio) => {
    const enlace = new URL(envio.enlace_apertura);
    const partes = enlace.pathname.split('/').filter(Boolean);
    const telefono = enlace.searchParams.get('phone') || partes[partes.length - 1] || '';
    const texto = enlace.searchParams.get('text') || envio.mensaje || '';
    return { telefono: telefono.replace(/\D/g, ''), texto };
  };

  const marcarAbierto = async (envio) => {
    setEnvioAbiertoId(envio.id);
    try { await actualizarEstadoMensaje(envio.id, 'ABIERTO'); } catch { /* el enlace ya fue abierto */ }
  };

  const abrir = async (envio) => {
    const esWhatsApp = envio.canal === 'WHATSAPP' || canal === 'WHATSAPP';
    if (!esWhatsApp) {
      window.open(envio.enlace_apertura, '_blank');
      await marcarAbierto(envio);
      return;
    }
    try {
      const { telefono, texto } = obtenerDatosWhatsApp(envio);
      if (!telefono) throw new Error('Teléfono inválido');
      window.location.assign(`whatsapp://send?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(texto)}`);
      await marcarAbierto(envio);
    } catch {
      toast.error('No se pudo abrir la aplicación de WhatsApp. Usa la alternativa Web.');
    }
  };

  const abrirWhatsAppWeb = async (envio) => {
    try {
      const { telefono, texto } = obtenerDatosWhatsApp(envio);
      if (!telefono) throw new Error('Teléfono inválido');
      window.open(`https://web.whatsapp.com/send?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
      await marcarAbierto(envio);
    } catch {
      toast.error('No se pudo abrir WhatsApp Web.');
    }
  };

  const guardarCompromiso = async (event) => {
    event.preventDefault();
    try {
      await registrarCompromisoPago({
        id_estado_pension: compromiso.id_estado_pension,
        fecha_compromiso: compromiso.fecha,
        monto: compromiso.monto || null,
        observacion: compromiso.observacion || null,
      });
      toast.success('Compromiso registrado; el apoderado quedó excluido de los envíos');
      setCompromiso(null);
      await cargar();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo registrar el compromiso');
    }
  };

  return (
    <div className="space-y-6">
      {dialogo && <Modal isOpen onClose={() => !procesando && setDialogo(null)} title={dialogo.paso === 'TIPO' ? 'Seleccione el tipo de mensaje que desea preparar' : 'Revise el modelo del mensaje'} size="xl">
        {dialogo.paso === 'TIPO' ? <div className="space-y-3">
          {dialogo.canal === 'SMS' && <p className="text-sm text-gray-600">SMS conserva su recordatorio actual. Los cuatro niveles están disponibles para WhatsApp.</p>}
          {(dialogo.canal === 'SMS' ? niveles.slice(0, 1) : niveles).map(tipo => <button key={tipo.nivel} type="button" disabled={procesando} onClick={() => revisarNivel(tipo.nivel)} className={`w-full rounded-xl border-2 p-4 text-left ${tipo.color}`}><span className="block font-bold">{tipo.icono} {tipo.nivel}. {tipo.nombre}</span><span className="mt-1 block text-sm">{tipo.descripcion}</span></button>)}
          <p className="text-sm text-gray-600">Seleccionar un nivel solo muestra la vista previa; no prepara ni envía mensajes.</p>
          <button type="button" disabled={procesando} className="btn-secondary" onClick={() => setDialogo(null)}>Cancelar</button>
        </div> : <div className="space-y-4">
          <div className={`rounded-xl border p-3 ${niveles[dialogo.nivel - 1].color}`}><p className="font-bold">{niveles[dialogo.nivel - 1].icono} Nivel {dialogo.nivel} · {niveles[dialogo.nivel - 1].nombre}</p><p className="text-sm">Se prepararán mensajes personalizados para {dialogo.mensajes.length} estudiante(s).</p></div>
          {dialogo.nivel === 4 && <p className="text-sm text-red-800">Utiliza este nivel solo si ya hubo avisos o coordinaciones previas.</p>}
          {dialogo.omitidos > 0 && <p className="text-sm text-amber-800">{dialogo.omitidos} concepto(s) omitidos por las reglas actuales de elegibilidad.</p>}
          {!dialogo.mensajes.length && <p>No hay deudas elegibles para preparar.</p>}
          {dialogo.mensajes.length > 0 && <section className="rounded-xl border border-gray-200 p-4"><pre className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm">{modeloMensaje(dialogo.mensajes[0])}</pre><button type="button" className="btn-secondary mt-3" onClick={() => copiarMensaje(modeloMensaje(dialogo.mensajes[0]))}>Copiar modelo</button></section>}
          <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-white py-3"><button type="button" disabled={procesando} className="btn-secondary" onClick={() => setDialogo(null)}>Cancelar</button><button type="button" disabled={procesando} className="btn-secondary" onClick={() => setDialogo({ ...dialogo, paso: 'TIPO' })}>Atrás / Cambiar tipo</button><button type="button" disabled={procesando || !dialogo.mensajes.length} className="btn-primary" onClick={preparar}>{procesando ? 'Preparando…' : 'Confirmar y preparar mensajes'}</button></div>
          <p className="text-xs text-gray-600">Los marcadores se sustituirán por el nombre y la deuda real de cada estudiante. Después podrás abrir cada mensaje; nada se envía automáticamente.</p>
        </div>}
      </Modal>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Cobranzas</h1>
          <p className="text-sm text-primary-800/60">Selecciona familias y abre cada mensaje para enviarlo desde WhatsApp o la aplicación SMS de tu teléfono.</p>
        </div>
        <button onClick={cargar} className="btn-secondary flex items-center gap-2"><HiRefresh /> Actualizar</button>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={() => setCanal('WHATSAPP')} className={`rounded-xl border-2 p-4 text-left transition ${canal === 'WHATSAPP' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3"><HiChatAlt2 className="h-7 w-7 text-emerald-600" /><div><p className="font-bold">WhatsApp semiautomático</p><p className="text-xs text-gray-600">Abre el chat con el texto listo. Tú confirmas el envío.</p></div></div>
          </button>
          <button onClick={() => setCanal('SMS')} className={`rounded-xl border-2 p-4 text-left transition ${canal === 'SMS' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3"><HiDeviceMobile className="h-7 w-7 text-blue-600" /><div><p className="font-bold">SMS desde el celular</p><p className="text-xs text-gray-600">Abre la aplicación SMS y utiliza los mensajes incluidos en tu plan.</p></div></div>
          </button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-bold text-primary-800">Conceptos pendientes por alumno</h2><p className="text-sm text-primary-800/60">{alumnos.length} alumnos deudores · {candidatos.length} conceptos pendientes</p><p className="text-sm font-semibold text-primary-700">{seleccionados.size} seleccionados · {moneda(total)}</p></div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Selección rápida de deudas">
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-300 bg-white px-4 py-2.5 text-sm font-semibold text-primary-800 shadow-sm transition hover:border-primary-500 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-300" onClick={() => setSeleccionados(new Set())}>
              <HiX className="text-lg" /> Ninguno
            </button>
            <button type="button" aria-pressed={todasLasDeudasSeleccionadas} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 ${todasLasDeudasSeleccionadas ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200 hover:bg-emerald-100' : 'border-primary-300 bg-white text-primary-800 hover:border-primary-500 hover:bg-primary-50 focus:ring-primary-300'}`} onClick={alternarTodasLasDeudas}>
              <HiCheckCircle className="text-lg" /> {todasLasDeudasSeleccionadas ? 'Deseleccionar todas las deudas' : 'Seleccionar todas las deudas'}
            </button>
            <button className="btn-primary" disabled={procesando || !seleccionados.size} onClick={iniciarPreparacion}>{procesando ? 'Preparando…' : 'Preparar mensajes'}</button>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3"><div className="relative min-w-[280px] max-w-xl flex-1"><HiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código, alumno, apoderado o teléfono" className="input-field w-full pl-10 pr-10" />{busqueda && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-700"><HiX /></button>}</div>{busqueda && <span className="text-sm text-primary-800/60">{alumnosFiltrados.length} de {alumnos.length} alumnos</span>}</div>
        {cargando && <div className="py-10 text-center">Cargando…</div>}
        {!cargando && !alumnos.length && <div className="py-10 text-center text-gray-500">No hay deudas pendientes.</div>}
        {!cargando && alumnos.length > 0 && !alumnosFiltrados.length && <div className="py-10 text-center text-gray-500">No se encontraron alumnos con ese criterio.</div>}
        <div className="space-y-4">
          {alumnosFiltrados.map((grupo) => <div key={grupo.id_alumno} className="overflow-hidden rounded-xl border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-primary-50 px-4 py-3"><div><p className="font-bold text-primary-900">{grupo.alumno} <span className="ml-2 rounded-md bg-white px-2 py-0.5 font-mono text-xs font-semibold text-primary-700">{grupo.codigo_alumno || 'Sin código'}</span></p><p className="text-xs text-gray-600">{grupo.apoderado || 'Sin apoderado'} · {grupo.telefono || 'Sin teléfono válido'}</p></div><p className="text-sm font-semibold">Seleccionado: {moneda(grupo.conceptos.filter((x) => seleccionados.has(x.id_estado_pension)).reduce((s, x) => s + Number(x.saldo), 0))}</p></div>
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-2">Cobrar</th><th className="px-4 py-2">Concepto / periodo</th><th className="px-4 py-2">Vencimiento</th><th className="px-4 py-2 text-right">Saldo</th><th className="px-4 py-2">Estado</th><th className="px-4 py-2">Acción</th></tr></thead><tbody className="divide-y divide-gray-100">{grupo.conceptos.map((item) => <tr key={item.id_estado_pension} className={!item.elegible ? 'bg-gray-50 text-gray-500' : ''}><td className="px-4 py-3"><input aria-label={`Cobrar ${item.concepto} de ${item.alumno}`} type="checkbox" checked={seleccionados.has(item.id_estado_pension)} disabled={!item.elegible} onChange={() => alternar(item.id_estado_pension)} className="h-4 w-4" /></td><td className="px-4 py-3 font-semibold">{item.concepto}</td><td className="px-4 py-3">{item.fecha_vencimiento || '—'}</td><td className="px-4 py-3 text-right font-semibold">{moneda(item.saldo)}</td><td className="px-4 py-3">{item.compromiso ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Compromiso {item.compromiso.fecha}</span> : item.elegible ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Disponible</span> : <span>{motivo[item.motivo_exclusion] || item.motivo_exclusion}</span>}</td><td className="px-4 py-3"><button className="text-xs font-semibold text-primary-700 hover:underline" onClick={() => setCompromiso({ ...item, fecha: '', monto: item.saldo, observacion: '' })}><HiCalendar className="mr-1 inline" />Compromiso</button></td></tr>)}</tbody></table></div>
          </div>)}
        </div>
      </Card>

      {cola.length > 0 && <Card><h2 className="mb-3 font-display text-lg font-bold text-primary-800">Mensajes preparados</h2><p className="mb-1 text-sm text-amber-700">Abrir no envía automáticamente: revisa el texto y pulsa Enviar en WhatsApp o SMS.</p><p className="mb-4 text-xs text-gray-500">La aplicación de WhatsApp es la opción recomendada: reutiliza la misma ventana y evita pestañas duplicadas. WhatsApp Web queda disponible como alternativa.</p><div className="space-y-3">{cola.map((envio) => <div key={envio.id} className={`flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${envioAbiertoId === envio.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'}`}><div><p className="font-semibold">{envio.alumno} · {envio.apoderado} {envioAbiertoId === envio.id && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Abierto en WhatsApp</span>}</p><p className="mt-1 max-w-3xl text-sm text-gray-600">{envio.mensaje}</p></div><div className="flex shrink-0 flex-wrap gap-2"><button onClick={() => abrir(envio)} className="btn-primary flex items-center justify-center gap-2"><HiDeviceMobile /> {canal === 'SMS' ? 'Abrir SMS' : 'Abrir en la aplicación'}</button>{canal === 'WHATSAPP' && <button type="button" onClick={() => abrirWhatsAppWeb(envio)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-300 bg-white px-3 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50"><HiExternalLink /> Usar Web</button>}</div></div>)}</div></Card>}

      {compromiso && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><form onSubmit={guardarCompromiso} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold text-primary-800">Registrar compromiso</h2><p className="mb-4 text-sm text-gray-600">{compromiso.alumno} · {compromiso.clave_mes}</p><label className="mb-3 block text-sm font-semibold">Fecha comprometida<input required type="date" value={compromiso.fecha} onChange={(e) => setCompromiso({ ...compromiso, fecha: e.target.value })} className="input-field mt-1 w-full" /></label><label className="mb-3 block text-sm font-semibold">Monto<input type="number" min="0.01" step="0.01" value={compromiso.monto} onChange={(e) => setCompromiso({ ...compromiso, monto: e.target.value })} className="input-field mt-1 w-full" /></label><label className="block text-sm font-semibold">Observación<textarea value={compromiso.observacion} onChange={(e) => setCompromiso({ ...compromiso, observacion: e.target.value })} className="input-field mt-1 w-full" rows="3" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setCompromiso(null)}>Cancelar</button><button className="btn-primary">Guardar compromiso</button></div></form></div>}
    </div>
  );
}


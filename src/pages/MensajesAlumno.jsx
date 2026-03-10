import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES, UPLOADS_BASE } from '../utils/constants';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { obtenerAlumno } from '../services/alumnosService';
import { listarHilos, crearHilo, obtenerMensajes, responderHilo } from '../services/mensajesService';
import { formatFechaHora } from '../utils/formatters';
import { HiArrowLeft, HiPlus, HiPaperAirplane, HiPaperClip, HiX, HiDocumentText, HiChat, HiDownload, HiEye } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { useSocketContext } from '../context/SocketContext';

const MensajesAlumno = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [alumno, setAlumno] = useState(null);
  const [hilos, setHilos] = useState([]);
  const [hiloActivo, setHiloActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevoHilo, setNuevoHilo] = useState({ asunto: '', mensaje: '' });
  const [nuevoAdjunto, setNuevoAdjunto] = useState(null);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [respuestaAdjunto, setRespuestaAdjunto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const { socket } = useSocketContext();
  const [preview, setPreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileInputNuevoRef = useRef(null);

  const isPadre = usuario?.rol_codigo === ROLES.PADRE;

  const fetchHilos = async () => {
    try {
      const { data } = await listarHilos({ id_alumno: id });
      setHilos(data.data || []);
    } catch {
      toast.error('Error al cargar hilos');
    }
  };

  const fetchMensajes = async (id_hilo) => {
    setLoadingMensajes(true);
    try {
      const { data } = await obtenerMensajes(id_hilo);
      setMensajes(data.data || []);
    } catch {
      toast.error('Error al cargar mensajes');
    } finally {
      setLoadingMensajes(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await obtenerAlumno(id);
        setAlumno(data.data);
        await fetchHilos();
      } catch {
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // WebSocket: append nuevo mensaje al chat (sin re-fetch)
  useSocket('mensaje:nuevo', (data) => {
    if (hiloActivo?.id === data.id_hilo && data.mensaje) {
      setMensajes(prev => {
        if (prev.some(m => m.id === data.mensaje.id)) return prev;
        return [...prev, data.mensaje];
      });
    }
  });
  useSocket('hilo:actualizado', () => fetchHilos());

  // Join/Leave room del hilo para recibir mensajes en tiempo real
  useEffect(() => {
    if (!socket || !hiloActivo) return;
    socket.emit('join:hilo', hiloActivo.id);
    return () => {
      socket.emit('leave:hilo', hiloActivo.id);
    };
  }, [socket, hiloActivo]);

  // Carga inicial de mensajes al abrir un hilo
  useEffect(() => {
    if (hiloActivo) fetchMensajes(hiloActivo.id);
  }, [hiloActivo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleCrearHilo = async (e) => {
    e.preventDefault();
    try {
      await crearHilo({ id_alumno: parseInt(id), asunto: nuevoHilo.asunto, mensaje: nuevoHilo.mensaje, adjunto: nuevoAdjunto });
      toast.success('Hilo creado');
      setModalNuevo(false);
      setNuevoHilo({ asunto: '', mensaje: '' });
      setNuevoAdjunto(null);
      fetchHilos();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear hilo');
    }
  };

  const handleResponder = async (e) => {
    e.preventDefault();
    if (!respuestaTexto.trim() || enviando) return;

    const textoEnviar = respuestaTexto;
    const adjuntoEnviar = respuestaAdjunto;

    // Limpiar input inmediatamente para fluidez
    setRespuestaTexto('');
    setRespuestaAdjunto(null);
    setEnviando(true);

    try {
      await responderHilo(hiloActivo.id, { mensaje: textoEnviar, adjunto: adjuntoEnviar });
      // El mensaje llegará via WebSocket (evento 'mensaje:nuevo' → append)
    } catch (err) {
      // Restaurar texto si falla
      setRespuestaTexto(textoEnviar);
      toast.error(err.response?.data?.error || 'Error al enviar');
    } finally {
      setEnviando(false);
    }
  };

  const renderAdjunto = (msg) => {
    if (!msg.adjunto_url) return null;
    const url = `${UPLOADS_BASE}${msg.adjunto_url}`;
    const nombre = msg.adjunto_nombre || 'Adjunto';
    const ext = nombre.toLowerCase().split('.').pop();
    const esImagen = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const esPdf = ext === 'pdf';
    const tipo = esImagen ? 'imagen' : esPdf ? 'pdf' : 'otro';
    return (
      <button onClick={() => setPreview({ url, nombre, tipo })} type="button"
        className="flex items-center gap-1 mt-2 px-2 py-1 bg-white/50 rounded text-xs text-gold-700 hover:text-gold-800 border border-gold-200 hover:bg-white/80 transition-colors">
        {esPdf ? <HiDocumentText className="w-3.5 h-3.5" /> : <HiPaperClip className="w-3.5 h-3.5" />}
        <span className="truncate max-w-[150px]">{nombre}</span>
        <HiEye className="w-3 h-3 ml-1 opacity-60" />
      </button>
    );
  };

  const goBack = () => {
    if (isPadre) {
      navigate('/mensajes');
    } else if (alumno?.id_aula || alumno?.tbl_aulas?.id) {
      navigate(`/mensajes/aula/${alumno.id_aula || alumno.tbl_aulas?.id}`);
    } else {
      navigate('/mensajes');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!alumno) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => navigate('/mensajes')} className="flex items-center gap-2 mb-4 text-primary-800/70 hover:text-primary-800">
          <HiArrowLeft className="w-5 h-5" /> Volver
        </button>
        <Card><p className="text-center text-gold-600 py-8">No se pudo cargar el alumno</p></Card>
      </div>
    );
  }

  const aulaInfo = alumno.tbl_aulas || alumno.aula;
  const gradoNombre = aulaInfo?.tbl_grados?.nombre || aulaInfo?.grado?.nombre || '';
  const nivelNombre = aulaInfo?.tbl_grados?.tbl_niveles?.nombre || aulaInfo?.grado?.nivel || '';
  const seccion = aulaInfo?.seccion || '';

  // --- Vista de Chat (hilo activo) ---
  if (hiloActivo) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { setHiloActivo(null); setMensajes([]); setRespuestaAdjunto(null); setPreview(null); }} className="p-2 text-primary-800/70 hover:bg-cream-100 rounded-lg">
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-primary-800">{hiloActivo.asunto}</h1>
            <p className="text-xs text-gold-600">{alumno.nombre_completo} — {gradoNombre} "{seccion}"</p>
          </div>
        </div>

        <Card className="flex-1 overflow-y-auto mb-4">
          {loadingMensajes ? <LoadingSpinner /> : (
            <div className="space-y-4">
              {mensajes.map(msg => (
                <div key={msg.id} className={`flex ${msg.id_remitente === usuario?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-3 rounded-lg ${msg.id_remitente === usuario?.id ? 'bg-gold-50 text-primary-900' : 'bg-cream-100 text-primary-800'}`}>
                    <p className="text-xs font-medium mb-1">{msg.remitente?.nombres}</p>
                    <p className="text-sm">{msg.contenido}</p>
                    {renderAdjunto(msg)}
                    <p className="text-[10px] text-gold-600 mt-1">{formatFechaHora(msg.enviado_en || msg.date_time_registration)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </Card>

        <form onSubmit={handleResponder} className="flex gap-2 items-end">
          <div className="flex-1">
            {respuestaAdjunto && (
              <div className="flex items-center gap-2 mb-1 px-3 py-1.5 bg-gold-50 rounded-lg text-xs text-gold-700">
                <HiPaperClip className="w-3.5 h-3.5" />
                <span className="truncate">{respuestaAdjunto.name}</span>
                <button type="button" onClick={() => setRespuestaAdjunto(null)}><HiX className="w-3.5 h-3.5 text-red-500" /></button>
              </div>
            )}
            <input type="text" value={respuestaTexto} onChange={(e) => setRespuestaTexto(e.target.value)}
              placeholder="Escribe un mensaje..." className="w-full px-4 py-2.5 border border-cream-300 rounded-lg outline-none focus:ring-2 focus:ring-gold-300" />
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => { if (e.target.files[0]) setRespuestaAdjunto(e.target.files[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2.5 text-gold-600 hover:text-primary-600 border border-cream-300 rounded-lg hover:bg-cream-50">
            <HiPaperClip className="w-5 h-5" />
          </button>
          <button type="submit" disabled={enviando} className="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm disabled:opacity-50">
            <HiPaperAirplane className="w-5 h-5" />
          </button>
        </form>

        {/* Modal de previsualización de adjunto */}
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-primary-900/30 backdrop-blur-sm" onClick={() => setPreview(null)}></div>
            <div className="relative bg-white rounded-xl shadow-gold-lg w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slide-up border border-cream-200">
              <div className="flex items-center justify-between p-4 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-white">
                <h3 className="text-sm font-semibold text-primary-800 truncate pr-4">{preview.nombre}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={preview.url} download={preview.nombre}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gold-700 bg-gold-50 rounded-lg hover:bg-gold-100 border border-gold-200 transition-colors">
                    <HiDownload className="w-3.5 h-3.5" /> Descargar
                  </a>
                  <button onClick={() => setPreview(null)} className="p-1.5 text-cream-400 hover:text-primary-600 rounded-lg hover:bg-cream-100 transition-colors">
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-center bg-cream-50 min-h-[300px] max-h-[calc(90vh-4rem)] overflow-auto">
                {preview.tipo === 'imagen' && (
                  <img src={preview.url} alt={preview.nombre} className="max-w-full max-h-[70vh] object-contain rounded" />
                )}
                {preview.tipo === 'pdf' && (
                  <iframe src={preview.url} title={preview.nombre} className="w-full h-[70vh] rounded border-0" />
                )}
                {preview.tipo === 'otro' && (
                  <div className="text-center py-8">
                    <HiDocumentText className="w-16 h-16 text-cream-300 mx-auto mb-3" />
                    <p className="text-gold-600 mb-4">No se puede previsualizar este tipo de archivo</p>
                    <a href={preview.url} download={preview.nombre}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                      <HiDownload className="w-4 h-4" /> Descargar archivo
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Vista de Hilos del Alumno ---
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 text-primary-800/70 hover:bg-cream-100 rounded-lg transition-colors">
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            {alumno.foto_url ? (
              <img src={alumno.foto_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-gold-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
                <span className="text-white text-lg font-bold">{alumno.nombre_completo?.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-primary-800 font-display">{alumno.nombre_completo}</h1>
              <p className="text-xs text-gold-600">{gradoNombre} "{seccion}" — {nivelNombre}</p>
            </div>
          </div>
        </div>
        <button onClick={() => { setNuevoHilo({ asunto: '', mensaje: '' }); setNuevoAdjunto(null); setModalNuevo(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
          <HiPlus className="w-4 h-4" /> Nuevo Mensaje
        </button>
      </div>

      {hilos.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <HiChat className="w-12 h-12 text-cream-300 mx-auto mb-3" />
            <p className="text-gold-600">No hay conversaciones para este alumno</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {hilos.map(hilo => (
            <div key={hilo.id} onClick={() => setHiloActivo(hilo)}
              className="bg-white border border-cream-200 rounded-lg p-4 cursor-pointer hover:bg-cream-50 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-primary-800">{hilo.asunto}</h3>
                <span className="text-xs text-gold-600">{formatFechaHora(hilo.ultimo_mensaje_fecha || hilo.date_time_registration)}</span>
              </div>
              <p className="text-sm text-gold-600 mt-1">
                {hilo.creador}
                {hilo.total_mensajes > 1 && <span className="ml-2 text-xs text-cream-400">({hilo.total_mensajes} mensajes)</span>}
              </p>
              {hilo.ultimo_mensaje && (
                <p className="text-xs text-cream-400 mt-1 truncate">{hilo.ultimo_mensaje}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Hilo */}
      <Modal isOpen={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo Mensaje">
        <form onSubmit={handleCrearHilo} className="space-y-4">
          <div className="bg-cream-50 p-3 rounded-lg">
            <p className="text-xs text-gold-600">Conversación sobre:</p>
            <p className="text-sm font-medium text-primary-800">{alumno.nombre_completo}</p>
            <p className="text-xs text-cream-400">{gradoNombre} "{seccion}"</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Asunto</label>
            <input type="text" value={nuevoHilo.asunto} onChange={(e) => setNuevoHilo({ ...nuevoHilo, asunto: e.target.value })} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Mensaje</label>
            <textarea value={nuevoHilo.mensaje} onChange={(e) => setNuevoHilo({ ...nuevoHilo, mensaje: e.target.value })} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" rows={4} />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Adjunto (opcional)</label>
            <input type="file" ref={fileInputNuevoRef} accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => { if (e.target.files[0]) setNuevoAdjunto(e.target.files[0]); }}
              className="w-full text-sm text-gold-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-gold-50" />
            <p className="text-xs text-cream-400 mt-1">JPG, PNG o PDF (max. 10MB)</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalNuevo(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Enviar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MensajesAlumno;

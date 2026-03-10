import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../services/notificacionesService';
import { formatFechaHora } from '../utils/formatters';
import { HiCheckCircle, HiBell, HiChevronRight, HiSpeakerphone } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';

// Construye la ruta de redireccion segun plantilla y referencia_id
const buildRuta = (codigo, refId) => {
  if (codigo === 'NOTIF_PERSONALIZADA') return null;
  // Rutas con detalle por alumno (/seccion/alumno/:id)
  const RUTAS_ALUMNO = {
    NUEVO_MENSAJE: '/mensajes/alumno',
    NUEVA_AGENDA: '/agenda/alumno',
    NUEVO_REPORTE: '/reportes-semanales/alumno',
    NO_LLEGO: '/asistencia',
    TARDANZA: '/asistencia',
  };
  // Comunicados: referencia_id es id_comunicado, no id_alumno
  if (codigo === 'NUEVO_COMUNICADO') return '/comunicados';
  if (codigo === 'PENSION_25_30') return '/pensiones';

  const base = RUTAS_ALUMNO[codigo];
  if (!base) return null;
  // Para asistencia no hay deep link por alumno
  if (codigo === 'NO_LLEGO' || codigo === 'TARDANZA') return base;
  return refId ? `${base}/${refId}` : base.split('/alumno')[0];
};

const Notificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await listarNotificaciones();
      setNotificaciones(data.data || []);
    } catch {
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // WebSocket: nueva notificacion en tiempo real
  useSocket('notificacion:nueva', (notif) => {
    setNotificaciones((prev) => [notif, ...prev]);
  });

  const handleClick = async (notif) => {
    if (!notif.leida) {
      try { await marcarLeida(notif.id); } catch { /* silent */ }
    }
    const ruta = buildRuta(notif.codigo_plantilla, notif.referencia_id);
    if (ruta) {
      navigate(ruta);
    } else {
      if (!notif.leida) fetchData();
    }
  };

  const handleMarcarTodas = async () => {
    try {
      await marcarTodasLeidas();
      toast.success('Todas marcadas como leídas');
      fetchData();
    } catch {
      toast.error('Error');
    }
  };

  if (loading) return <LoadingSpinner />;

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Notificaciones</h1>
          {noLeidas > 0 && <Badge variant="danger">{noLeidas} sin leer</Badge>}
        </div>
        {noLeidas > 0 && (
          <button onClick={handleMarcarTodas} className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-gold-50 font-medium">
            <HiCheckCircle className="w-4 h-4" /> Marcar todas como leídas
          </button>
        )}
      </div>

      {notificaciones.length === 0 ? (
        <Card><p className="text-center text-gold-600 py-8">No hay notificaciones</p></Card>
      ) : (
        <div className="space-y-2">
          {notificaciones.map(notif => {
            const isCustom = notif.codigo_plantilla === 'NOTIF_PERSONALIZADA';
            return (
              <div key={notif.id} onClick={() => handleClick(notif)}
                className={`border rounded-lg p-4 cursor-pointer transition-colors hover:shadow-md ${
                  isCustom
                    ? (notif.leida ? 'bg-white border-blue-200 hover:border-blue-300' : 'bg-blue-50 border-blue-300 shadow-sm hover:bg-blue-100')
                    : (notif.leida ? 'bg-white border-cream-200 hover:border-cream-300' : 'bg-gold-50 border-gold-300 shadow-sm hover:bg-gold-100')
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 mt-0.5 ${
                    isCustom
                      ? (notif.leida ? 'text-blue-300' : 'text-blue-600')
                      : (notif.leida ? 'text-cream-400' : 'text-primary-600')
                  }`}>
                    {isCustom ? <HiSpeakerphone className="w-5 h-5" /> : <HiBell className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${notif.leida ? 'text-primary-800/70' : 'text-primary-800 font-medium'}`}>{notif.mensaje}</p>
                      {isCustom && !notif.leida && <Badge variant="info">Aviso</Badge>}
                    </div>
                    <p className="text-xs text-gold-600 mt-1">{formatFechaHora(notif.date_time_registration)}</p>
                  </div>
                  {buildRuta(notif.codigo_plantilla, notif.referencia_id) && (
                    <HiChevronRight className={`w-5 h-5 flex-shrink-0 mt-0.5 ${notif.leida ? 'text-cream-400' : 'text-gold-500'}`} />
                  )}
                  {!notif.leida && !buildRuta(notif.codigo_plantilla, notif.referencia_id) && (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${isCustom ? 'bg-blue-500' : 'bg-gold-500'}`}></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notificaciones;

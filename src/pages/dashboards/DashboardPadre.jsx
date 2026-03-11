import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileUrl } from '../../utils/constants';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';
import { listarAlertasPadre } from '../../services/alertasService';
import { obtenerHijosPadre } from '../../services/asistenciaService';
import apiClient from '../../services/apiClient';
import { formatFechaHora } from '../../utils/formatters';
import { HiClipboardCheck, HiBookOpen, HiChat, HiCurrencyDollar, HiExclamation, HiPhone, HiIdentification, HiDocumentText, HiSpeakerphone, HiBell } from 'react-icons/hi';
import { useSocket } from '../../hooks/useSocket';

const DashboardPadre = () => {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState([]);
  const [hijos, setHijos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telefonoWa, setTelefonoWa] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [alertasR, hijosR, colegioR] = await Promise.all([
          listarAlertasPadre(),
          obtenerHijosPadre(),
          apiClient.get('/config-escolar/colegio').catch(() => ({ data: { data: {} } })),
        ]);
        setAlertas(alertasR.data.data || []);
        setHijos(hijosR.data.data || []);
        setTelefonoWa(colegioR.data.data?.telefono_whatsapp || null);
      } catch {
        setAlertas([]);
        setHijos([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // WebSocket: nueva alerta "no llegó" en tiempo real
  useSocket('alerta:nueva', (data) => {
    setAlertas((prev) => [data, ...prev]);
  });

  // WebSocket: alerta cerrada (alumno llegó)
  useSocket('alerta:cerrada', (data) => {
    setAlertas((prev) => prev.filter((a) => a.id_alumno !== data.id_alumno));
  });

  if (loading) return <LoadingSpinner />;

  const alertasAbiertas = alertas.filter(a => a.estado === 'ABIERTA');

  const abrirWhatsApp = (alerta) => {
    if (!telefonoWa) return;
    const numero = telefonoWa.replace(/[^0-9]/g, '');
    const texto = encodeURIComponent(`Hola, soy padre/madre de ${alerta.alumno?.nombre_completo || 'mi hijo(a)'}. ${alerta.mensaje || 'Recibi una alerta'} y quisiera informar sobre la situacion.`);
    window.open(`https://wa.me/${numero}?text=${texto}`, '_blank');
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Dashboard</h1>

      {hijos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {hijos.map(hijo => (
            <Card key={hijo.id}>
              <div className="flex items-center gap-3">
                {hijo.foto_url ? (
                  <img src={fileUrl(hijo.foto_url)} alt={hijo.nombre_completo} className="w-12 h-12 rounded-full object-cover border-2 border-gold-200" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
                    <span className="text-white font-bold text-lg">{hijo.nombre_completo?.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-primary-800">{hijo.nombre_completo}</p>
                  <p className="text-xs text-gold-600">
                    {hijo.aula?.grado?.nivel} - {hijo.aula?.grado?.nombre} {hijo.aula?.seccion}
                  </p>
                  <Badge variant={hijo.estado === 'ACTIVO' ? 'success' : 'danger'}>{hijo.estado}</Badge>
                </div>
                <button onClick={() => navigate(`/carnet/${hijo.id}`)} className="ml-auto p-2 text-gold-600 hover:bg-gold-50 rounded-lg transition-colors" title="Ver Carnet">
                  <HiIdentification className="w-6 h-6" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {alertasAbiertas.length > 0 && (
        <Card className="mb-6 border-primary-200 bg-primary-50/50">
          <div className="flex items-center gap-2 mb-3">
            <HiExclamation className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-primary-800 font-display">Alertas Activas</h3>
          </div>
          <div className="space-y-2">
            {alertasAbiertas.map(alerta => (
              <div key={alerta.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-primary-100">
                <div>
                  <p className="text-sm font-medium text-primary-800">{alerta.alumno?.nombre_completo}</p>
                  <p className="text-xs text-primary-600/70">{alerta.mensaje}</p>
                </div>
                <div className="flex items-center gap-2">
                  {telefonoWa && (
                    <button onClick={() => abrirWhatsApp(alerta)} className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 flex items-center gap-1 border border-emerald-200">
                      <HiPhone className="w-3 h-3" /> WhatsApp
                    </button>
                  )}
                  <Badge variant="danger">{formatFechaHora(alerta.date_time_registration)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Asistencia', icon: HiClipboardCheck, to: '/asistencia', color: 'bg-primary-600' },
          { label: 'Agenda', icon: HiBookOpen, to: '/agenda', color: 'bg-gold-500' },
          { label: 'Reportes', icon: HiDocumentText, to: '/reportes-semanales', color: 'bg-gold-700' },
          { label: 'Mensajes', icon: HiChat, to: '/mensajes', color: 'bg-primary-500' },
          { label: 'Comunicados', icon: HiSpeakerphone, to: '/comunicados', color: 'bg-emerald-600' },
          { label: 'Pensiones', icon: HiCurrencyDollar, to: '/pensiones', color: 'bg-amber-500' },
          { label: 'Notificaciones', icon: HiBell, to: '/notificaciones', color: 'bg-gold-600' },
        ].map(item => (
          <div key={item.label} onClick={() => navigate(item.to)} className="cursor-pointer group">
            <Card>
              <div className="flex flex-col items-center gap-2 py-2">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${item.color} shadow-md group-hover:scale-105 transition-transform duration-200`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-primary-800">{item.label}</span>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPadre;

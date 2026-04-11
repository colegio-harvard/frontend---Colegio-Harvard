import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { asistenciaHoy } from '../../services/asistenciaService';
import { listarAgenda } from '../../services/agendaService';
import { HiClipboardCheck, HiBookOpen, HiChat, HiExclamationCircle, HiPencilAlt, HiDocumentText, HiBell } from 'react-icons/hi';
import { useSocket } from '../../hooks/useSocket';

const DashboardTutor = () => {
  const navigate = useNavigate();
  const [resumenHoy, setResumenHoy] = useState(null);
  const [agendaSinFirmar, setAgendaSinFirmar] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [asistR, agendaR] = await Promise.all([
          asistenciaHoy(),
          listarAgenda().catch(() => ({ data: { data: [] } })),
        ]);
        const alumnos = asistR.data.data || [];
        const presentes = alumnos.filter(a => a.estado === 'PRESENTE').length;
        const tardes = alumnos.filter(a => a.estado === 'TARDE').length;
        const ausentes = alumnos.filter(a => a.estado === 'AUSENTE').length;
        const sinRegistro = alumnos.filter(a => !a.estado).length;
        setResumenHoy({ total: alumnos.length, presentes, tardes, ausentes, sinRegistro });

        const entradas = agendaR.data.data || [];
        const sinFirmarCompleto = entradas.filter(e => {
          if (!e.requiere_firma) return false;
          const totalAlumnos = resumenHoy?.total || alumnos.length;
          const totalFirmas = e.firmas?.length || 0;
          return totalFirmas < totalAlumnos;
        });
        setAgendaSinFirmar(sinFirmarCompleto.length);
      } catch {
        setResumenHoy({ total: 0, presentes: 0, tardes: 0, ausentes: 0, sinRegistro: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // WebSocket: evento de asistencia en tiempo real
  useSocket('asistencia:evento', (data) => {
    if (!resumenHoy) return;
    setResumenHoy((prev) => {
      const updated = { ...prev };
      if (data.tipo_evento === 'CHECKIN') {
        updated.sinRegistro = Math.max(0, updated.sinRegistro - 1);
        updated.presentes = updated.presentes + 1;
      }
      return updated;
    });
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Mi Aula - Hoy</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gold-600 font-medium">Asistencias</p>
          <p className="text-3xl font-bold text-emerald-600 font-display">{resumenHoy.presentes}</p>
        </Card>
        <Card>
          <p className="text-sm text-gold-600 font-medium">Tardanzas</p>
          <p className="text-3xl font-bold text-amber-600 font-display">{resumenHoy.tardes}</p>
        </Card>
        <Card>
          <p className="text-sm text-gold-600 font-medium">Faltas</p>
          <p className="text-3xl font-bold text-primary-600 font-display">{resumenHoy.ausentes}</p>
        </Card>
        <Card>
          <p className="text-sm text-gold-600 font-medium">Sin registro</p>
          <p className="text-3xl font-bold text-cream-400 font-display">{resumenHoy.sinRegistro}</p>
        </Card>
      </div>

      {agendaSinFirmar > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {agendaSinFirmar > 0 && (
            <div onClick={() => navigate('/agenda')} className="cursor-pointer">
              <Card className="border-primary-200 bg-primary-50/50">
                <div className="flex items-center gap-3">
                  <HiPencilAlt className="w-8 h-8 text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-primary-800">Agenda con firmas pendientes</p>
                    <p className="text-2xl font-bold text-primary-700 font-display">{agendaSinFirmar}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Asistencia', icon: HiClipboardCheck, to: '/asistencia', color: 'bg-primary-600' },
          { label: 'Agenda', icon: HiBookOpen, to: '/agenda', color: 'bg-gold-500' },
          { label: 'Reportes', icon: HiDocumentText, to: '/reportes-semanales', color: 'bg-gold-700' },
          { label: 'Mensajes', icon: HiChat, to: '/mensajes', color: 'bg-primary-500' },
          { label: 'Notificaciones', icon: HiBell, to: '/notificaciones', color: 'bg-gold-600' },
        ].map(item => (
          <div key={item.label} onClick={() => navigate(item.to)} className="cursor-pointer group">
            <Card>
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${item.color} shadow-md group-hover:scale-105 transition-transform duration-200`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-primary-800">{item.label}</span>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardTutor;

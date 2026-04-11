import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { dashboardAdmin } from '../../services/asistenciaService';
import {
  HiUsers, HiAcademicCap, HiUserGroup, HiClipboardCheck,
  HiExclamationCircle, HiClock, HiXCircle, HiCheckCircle,
  HiTrendingUp, HiBell, HiCog, HiBookOpen, HiChat,
  HiSpeakerphone, HiCurrencyDollar, HiCalendar, HiShieldCheck, HiDocumentText,
} from 'react-icons/hi';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetchData = async () => {
    try {
      const res = await dashboardAdmin();
      setData(res.data.data);
    } catch { /* silenciar */ }
  };

  useEffect(() => {
    refetchData().finally(() => setLoading(false));
  }, []);

  useSocket('asistencia:evento', () => refetchData());
  useSocket('alerta:nueva', () => refetchData());
  useSocket('alerta:cerrada', () => refetchData());

  if (loading) return <LoadingSpinner />;

  if (!data || data.sinAnioActivo) {
    return (
      <div className="animate-fade-in">
        <h1 className="page-title mb-6">Dashboard</h1>
        <Card className="border-gold-200 bg-gold-50/50">
          <div className="flex items-center gap-3 py-4">
            <HiExclamationCircle className="w-8 h-8 text-gold-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gold-800 font-display">No hay año escolar activo</p>
              <p className="text-sm text-gold-600 mt-1">
                Configure un año escolar activo en{' '}
                <span onClick={() => navigate('/config-escolar')} className="underline cursor-pointer font-medium">
                  Configuracion Escolar
                </span>{' '}
                para ver los datos del dashboard.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { resumenHoy, resumenAulas, ausentes, tardes, alertasAbiertas, conteos } = data;

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '-';
    }
  };

  // Columns for attendance by classroom
  const aulasColumns = [
    { header: 'Aula', render: (row) => <span className="font-medium text-primary-800">{row.nombre}</span> },
    { header: 'Nivel', accessor: 'nivel' },
    { header: 'Total', render: (row) => <span className="font-semibold">{row.total}</span> },
    {
      header: 'Asistencias',
      render: (row) => (
        <span className="text-emerald-700 font-semibold">{row.presentes}</span>
      ),
    },
    {
      header: 'Tardanzas',
      render: (row) => (
        <span className={`font-semibold ${row.tardes > 0 ? 'text-amber-600' : 'text-primary-800/50'}`}>{row.tardes}</span>
      ),
    },
    {
      header: 'Faltas',
      render: (row) => (
        <span className={`font-semibold ${row.ausentes > 0 ? 'text-red-600' : 'text-primary-800/50'}`}>{row.ausentes}</span>
      ),
    },
    {
      header: 'Sin registro',
      render: (row) => (
        <span className={`font-semibold ${row.sinRegistro > 0 ? 'text-cream-400' : 'text-primary-800/50'}`}>{row.sinRegistro}</span>
      ),
    },
    {
      header: '% Asistencia',
      render: (row) => {
        const pct = row.porcentaje;
        const color = pct >= 90 ? 'text-emerald-700 bg-emerald-50' : pct >= 70 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
            {pct}%
          </span>
        );
      },
    },
  ];

  // Columns for absent students
  const ausentesColumns = [
    { header: 'Alumno', render: (row) => <span className="font-medium">{row.nombre}</span> },
    { header: 'Código', accessor: 'codigo' },
    { header: 'Aula', accessor: 'aula' },
  ];

  // Columns for late students
  const tardesColumns = [
    { header: 'Alumno', render: (row) => <span className="font-medium">{row.nombre}</span> },
    { header: 'Código', accessor: 'codigo' },
    { header: 'Aula', accessor: 'aula' },
    { header: 'Hora Ingreso', render: (row) => formatTime(row.hora_ingreso) },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Dashboard</h1>
        <span className="text-sm text-gold-600 font-medium">
          {new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* KPI Cards - Asistencia de Hoy */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div onClick={() => navigate('/asistencia')} className="cursor-pointer group">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500 shadow-md group-hover:scale-105 transition-transform duration-200">
                <HiCheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gold-600 font-medium">Asistencias</p>
                <p className="text-2xl font-bold text-emerald-600 font-display">{resumenHoy.presentes}</p>
              </div>
            </div>
          </Card>
        </div>

        <div onClick={() => navigate('/asistencia')} className="cursor-pointer group">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500 shadow-md group-hover:scale-105 transition-transform duration-200">
                <HiClock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gold-600 font-medium">Tardanzas</p>
                <p className="text-2xl font-bold text-amber-600 font-display">{resumenHoy.tardes}</p>
              </div>
            </div>
          </Card>
        </div>

        <div onClick={() => navigate('/asistencia')} className="cursor-pointer group">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-500 shadow-md group-hover:scale-105 transition-transform duration-200">
                <HiXCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gold-600 font-medium">Faltas</p>
                <p className="text-2xl font-bold text-red-600 font-display">{resumenHoy.ausentes}</p>
              </div>
            </div>
          </Card>
        </div>

        <div onClick={() => navigate('/asistencia')} className="cursor-pointer group">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-600 shadow-md group-hover:scale-105 transition-transform duration-200">
                <HiTrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gold-600 font-medium">% Asistencia</p>
                <p className="text-2xl font-bold text-primary-700 font-display">{resumenHoy.porcentaje}%</p>
              </div>
            </div>
          </Card>
        </div>

        <div onClick={() => navigate('/alumnos')} className="cursor-pointer group">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gold-500 shadow-md group-hover:scale-105 transition-transform duration-200">
                <HiAcademicCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gold-600 font-medium">Total Alumnos</p>
                <p className="text-2xl font-bold text-gold-700 font-display">{resumenHoy.totalAlumnos}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Alertas rápidas */}
      {alertasAbiertas > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {alertasAbiertas > 0 && (
            <div onClick={() => navigate('/alertas')} className="cursor-pointer">
              <Card className="border-primary-200 bg-primary-50/50">
                <div className="flex items-center gap-3">
                  <HiBell className="w-8 h-8 text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-primary-800">Alertas "No llegó" abiertas</p>
                    <p className="text-2xl font-bold text-primary-700 font-display">{alertasAbiertas}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Asistencia por Salón */}
      <Card title="Asistencia por Salón - Hoy" className="mb-6">
        <DataTable
          columns={aulasColumns}
          data={resumenAulas}
          emptyMessage="No hay aulas registradas"
        />
      </Card>

      {/* Dos tablas lado a lado: Ausentes y Tardes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Alumnos Ausentes */}
        <Card
          title={`Alumnos que Faltaron Hoy (${ausentes.length})`}
          actions={
            ausentes.length > 0 && (
              <Badge variant="danger">{ausentes.length}</Badge>
            )
          }
        >
          <div className="max-h-72 overflow-y-auto">
            <DataTable
              columns={ausentesColumns}
              data={ausentes}
              emptyMessage="No hay faltas hoy"
            />
          </div>
        </Card>

        {/* Alumnos con Tardanza */}
        <Card
          title={`Tardanzas Hoy (${tardes.length})`}
          actions={
            tardes.length > 0 && (
              <Badge variant="warning">{tardes.length}</Badge>
            )
          }
        >
          <div className="max-h-72 overflow-y-auto">
            <DataTable
              columns={tardesColumns}
              data={tardes}
              emptyMessage="No hay tardanzas hoy"
            />
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Asistencia', icon: HiClipboardCheck, to: '/asistencia', color: 'bg-primary-600' },
          { label: 'Alumnos', icon: HiAcademicCap, to: '/alumnos', color: 'bg-gold-500' },
          { label: 'Padres', icon: HiUserGroup, to: '/padres', color: 'bg-primary-500' },
          ...(usuario?.rol_codigo === ROLES.SUPER_ADMIN ? [{ label: 'Usuarios', icon: HiUsers, to: '/usuarios', color: 'bg-amber-600' }] : []),
          { label: 'Config. Escolar', icon: HiCog, to: '/config-escolar', color: 'bg-primary-700' },
          { label: 'Agenda', icon: HiBookOpen, to: '/agenda', color: 'bg-emerald-600' },
          { label: 'Reportes', icon: HiDocumentText, to: '/reportes-semanales', color: 'bg-gold-700' },
          { label: 'Mensajes', icon: HiChat, to: '/mensajes', color: 'bg-gold-600' },
          { label: 'Comunicados', icon: HiSpeakerphone, to: '/comunicados', color: 'bg-emerald-500' },
          { label: 'Pensiones', icon: HiCurrencyDollar, to: '/pensiones', color: 'bg-amber-500' },
          { label: 'Año Escolar', icon: HiCalendar, to: '/anio-escolar', color: 'bg-primary-800' },
          { label: 'Notificaciones', icon: HiBell, to: '/notificaciones', color: 'bg-gold-500' },
          ...(usuario?.rol_codigo === ROLES.SUPER_ADMIN ? [{ label: 'Auditoría', icon: HiShieldCheck, to: '/auditoria', color: 'bg-primary-900' }] : []),
        ].map(item => (
          <div key={item.label} onClick={() => navigate(item.to)} className="cursor-pointer group">
            <Card>
              <div className="flex flex-col items-center gap-2 py-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${item.color} shadow-md group-hover:scale-110 transition-transform duration-200`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-primary-800">{item.label}</span>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardAdmin;

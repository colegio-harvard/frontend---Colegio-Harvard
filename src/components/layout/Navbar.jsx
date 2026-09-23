import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { ROLES_LABELS } from '../../utils/constants';
import { contarNoLeidas } from '../../services/notificacionesService';
import { useSocket } from '../../hooks/useSocket';
import { HiMenu, HiBell, HiLogout, HiVolumeOff, HiVolumeUp, HiOfficeBuilding, HiSpeakerphone } from 'react-icons/hi';
import logoHarvard from '../../assets/logo-harvard.png';
import { playOperationalAlert } from '../../utils/sounds';

const notificacionesProcesadas = new Set();

const Navbar = ({ onMenuClick }) => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [noLeidas, setNoLeidas] = useState(0);
  const [sonidoAlertas, setSonidoAlertas] = useState(true);
  const esAdministrador = ['SUPER_ADMIN', 'ADMIN'].includes(usuario?.rol_codigo);

  useEffect(() => {
    if (!usuario?.id) return;
    setSonidoAlertas(localStorage.getItem(`sonido-alertas-${usuario.id}`) !== 'false');
  }, [usuario?.id]);

  useEffect(() => {
    const fetchNoLeidas = async () => {
      try {
        const { data } = await contarNoLeidas();
        setNoLeidas(data.no_leidas || data.count || 0);
      } catch {
        // silenciar
      }
    };
    fetchNoLeidas();
  }, []);

  // WebSocket: actualizar conteo en tiempo real
  useSocket('notificacion:conteo', (data) => setNoLeidas(data.no_leidas || 0));
  useSocket('notificacion:nueva', (notificacion) => {
    setNoLeidas((prev) => prev + 1);
    if (notificacion?.codigo_plantilla !== 'ALERTA_OPERATIVA') return;
    const clave = notificacion.id || `${notificacion.titulo}-${notificacion.date_time_registration}`;
    if (notificacionesProcesadas.has(clave)) return;
    notificacionesProcesadas.add(clave);
    const esDerivacion = notificacion.titulo === 'Alumno derivado a oficina';
    if (sonidoAlertas) playOperationalAlert(esDerivacion ? 'DERIVAR_OFICINA' : 'AVISAR_ADMINISTRACION');
    toast.custom((t) => (
      <button
        type="button"
        onClick={() => { toast.dismiss(t.id); navigate('/alertas-internas'); }}
        className={`flex w-full max-w-md items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-xl transition ${t.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'} ${esDerivacion ? 'border-blue-300' : 'border-amber-300'}`}
      >
        <span className={`mt-0.5 rounded-full p-2 text-white ${esDerivacion ? 'bg-blue-700' : 'bg-amber-600'}`}>{esDerivacion ? <HiOfficeBuilding className="h-5 w-5"/> : <HiSpeakerphone className="h-5 w-5"/>}</span>
        <span className="min-w-0 flex-1"><strong className="block text-sm text-primary-900">{notificacion.titulo}</strong><span className="mt-1 block text-sm leading-snug text-primary-700">{notificacion.mensaje}</span><span className="mt-2 block text-xs font-bold text-primary-700">Abrir Alertas internas →</span></span>
      </button>
    ), { duration: esDerivacion ? 10000 : 7000, position: 'top-right' });
  });

  const alternarSonido = () => {
    const nuevoValor = !sonidoAlertas;
    setSonidoAlertas(nuevoValor);
    if (usuario?.id) localStorage.setItem(`sonido-alertas-${usuario.id}`, String(nuevoValor));
    if (nuevoValor) playOperationalAlert('AVISAR_ADMINISTRACION');
    toast.success(nuevoValor ? 'Sonido de alertas activado' : 'Sonido de alertas silenciado');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-cream-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-primary-700 hover:text-primary-900 rounded-lg hover:bg-cream-100 transition-colors">
          <HiMenu className="w-6 h-6" />
        </button>

        <div className="hidden lg:flex items-center gap-2.5">
          <img src={logoHarvard} alt="Colegio Harvard" className="w-8 h-8 rounded-full object-cover border border-gold-300" />
          <span className="text-sm font-display font-bold text-primary-800 tracking-wide">Colegio Harvard</span>
          <div className="gold-line w-16 opacity-40 ml-1"></div>
        </div>

        <div className="flex items-center gap-3">
          {esAdministrador && <button type="button" onClick={alternarSonido} className={`rounded-lg p-2 transition-colors ${sonidoAlertas ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-cream-100 text-primary-500 hover:bg-cream-200'}`} title={sonidoAlertas ? 'Sonido de alertas activado. Clic para silenciar' : 'Sonido de alertas silenciado. Clic para activar'} aria-label={sonidoAlertas ? 'Silenciar sonido de alertas' : 'Activar sonido de alertas'}>{sonidoAlertas ? <HiVolumeUp className="h-5 w-5"/> : <HiVolumeOff className="h-5 w-5"/>}</button>}
          <button
            onClick={() => navigate('/notificaciones')}
            className="relative p-2 text-gold-600 hover:text-gold-700 rounded-lg hover:bg-gold-50 transition-all duration-200"
          >
            <HiBell className="w-5 h-5" />
            {noLeidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full animate-pulse">
                {noLeidas > 9 ? '9+' : noLeidas}
              </span>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-cream-50 rounded-lg border border-cream-200">
            <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
              <span className="text-white text-xs font-bold">{usuario?.nombres?.charAt(0) || 'U'}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-primary-800">{usuario?.nombres}</p>
              <p className="text-xs text-gold-600 font-medium">{ROLES_LABELS[usuario?.rol_codigo]}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-cream-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-all duration-200"
            title="Cerrar sesión"
          >
            <HiLogout className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;


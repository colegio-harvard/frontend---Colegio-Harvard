import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES_LABELS } from '../../utils/constants';
import { contarNoLeidas } from '../../services/notificacionesService';
import { useSocket } from '../../hooks/useSocket';
import { HiMenu, HiBell, HiLogout } from 'react-icons/hi';
import logoHarvard from '../../assets/logo-harvard.png';

const Navbar = ({ onMenuClick }) => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [noLeidas, setNoLeidas] = useState(0);

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
  useSocket('notificacion:nueva', () => setNoLeidas((prev) => prev + 1));

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

import { NavLink } from 'react-router-dom';
import { ROLES } from '../../utils/constants';
import {
  HiHome, HiUsers, HiAcademicCap, HiUserGroup,
  HiClipboardCheck, HiBookOpen, HiChat, HiSpeakerphone, HiCurrencyDollar,
  HiCog, HiBell, HiDocumentText, HiCalendar, HiShieldCheck, HiX
} from 'react-icons/hi';
import logoHarvard from '../../assets/logo-harvard.png';

const menuItems = {
  [ROLES.SUPER_ADMIN]: [
    { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
    { to: '/usuarios', icon: HiUsers, label: 'Usuarios' },
    { to: '/config-escolar', icon: HiCog, label: 'Config. Escolar' },
    { to: '/padres', icon: HiUserGroup, label: 'Padres' },
    { to: '/alumnos', icon: HiAcademicCap, label: 'Alumnos' },
    { to: '/asistencia', icon: HiClipboardCheck, label: 'Asistencia' },
    { to: '/agenda', icon: HiBookOpen, label: 'Agenda' },
    { to: '/reportes-semanales', icon: HiDocumentText, label: 'Reportes' },
    { to: '/mensajes', icon: HiChat, label: 'Chats' },
    { to: '/comunicados', icon: HiSpeakerphone, label: 'Comunicados' },
    { to: '/pensiones', icon: HiCurrencyDollar, label: 'Pensiones' },
    { to: '/anio-escolar', icon: HiCalendar, label: 'Año Escolar' },
    { to: '/notificaciones', icon: HiBell, label: 'Notificaciones' },
    { to: '/auditoria', icon: HiShieldCheck, label: 'Auditoria' },
  ],
  [ROLES.ADMIN]: [
    { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
    { to: '/padres', icon: HiUserGroup, label: 'Padres' },
    { to: '/alumnos', icon: HiAcademicCap, label: 'Alumnos' },
    { to: '/config-escolar', icon: HiCog, label: 'Config. Escolar' },
    { to: '/asistencia', icon: HiClipboardCheck, label: 'Asistencia' },
    { to: '/agenda', icon: HiBookOpen, label: 'Agenda' },
    { to: '/reportes-semanales', icon: HiDocumentText, label: 'Reportes' },
    { to: '/mensajes', icon: HiChat, label: 'Chats' },
    { to: '/comunicados', icon: HiSpeakerphone, label: 'Comunicados' },
    { to: '/pensiones', icon: HiCurrencyDollar, label: 'Pensiones' },
    { to: '/anio-escolar', icon: HiCalendar, label: 'Año Escolar' },
    { to: '/notificaciones', icon: HiBell, label: 'Notificaciones' },
  ],
  [ROLES.TUTOR]: [
    { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
    { to: '/asistencia', icon: HiClipboardCheck, label: 'Asistencia Hoy' },
    { to: '/agenda', icon: HiBookOpen, label: 'Agenda' },
    { to: '/reportes-semanales', icon: HiDocumentText, label: 'Reportes' },
    { to: '/mensajes', icon: HiChat, label: 'Chats' },
    { to: '/notificaciones', icon: HiBell, label: 'Notificaciones' },
  ],
  [ROLES.PADRE]: [
    { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
    { to: '/asistencia', icon: HiClipboardCheck, label: 'Asistencia' },
    { to: '/agenda', icon: HiBookOpen, label: 'Agenda' },
    { to: '/reportes-semanales', icon: HiDocumentText, label: 'Reportes' },
    { to: '/mensajes', icon: HiChat, label: 'Chats' },
    { to: '/comunicados', icon: HiSpeakerphone, label: 'Comunicados' },
    { to: '/pensiones', icon: HiCurrencyDollar, label: 'Pensiones' },
    { to: '/notificaciones', icon: HiBell, label: 'Notificaciones' },
  ],
  [ROLES.PORTERIA]: [
    { to: '/dashboard', icon: HiHome, label: 'Escaneo' },
  ],
  [ROLES.PSICOLOGIA]: [
    { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
    { to: '/comunicados', icon: HiSpeakerphone, label: 'Comunicados' },
  ],
};

const Sidebar = ({ isOpen, onClose }) => {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const items = menuItems[usuario.rol_codigo] || [];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-primary-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose}></div>
      )}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar-gradient transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header with gold accent */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-primary-700/50">
          <div className="flex items-center gap-2.5">
            <img src={logoHarvard} alt="Colegio Harvard" className="w-10 h-10 rounded-full object-cover border-2 border-gold-400 shadow-gold" />
            <div>
              <span className="text-sm font-bold text-white font-display tracking-wide">Colegio Harvard</span>
              <div className="gold-line-left mt-0.5 w-20 opacity-60"></div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-primary-200 hover:text-white transition-colors">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100%-4rem)]">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/15 text-gold-300 shadow-sm backdrop-blur-sm border border-white/10'
                    : 'text-primary-100 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

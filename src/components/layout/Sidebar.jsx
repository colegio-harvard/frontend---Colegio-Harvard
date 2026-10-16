import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ROLES } from '../../utils/constants';
import {
  HiHome, HiUsers, HiAcademicCap, HiUserGroup,
  HiClipboardCheck, HiBookOpen, HiChat, HiSpeakerphone, HiCurrencyDollar,
  HiCog, HiBell, HiDocumentText, HiChartBar, HiPrinter, HiCalendar, HiShieldCheck, HiX, HiQrcode, HiUpload, HiMail, HiClipboardList, HiArchive, HiClock, HiChevronDown,
} from 'react-icons/hi';
import logoHarvard from '../../assets/logo-harvard.png';

const menuItems = {
  [ROLES.SUPER_ADMIN]: [
    { to: '/dashboard', icon: HiHome, label: 'Dashboard' }, { to: '/registro-asistencia', icon: HiQrcode, label: 'Tomar Asistencia' }, { to: '/usuarios', icon: HiUsers, label: 'Usuarios' }, { to: '/config-escolar', icon: HiCog, label: 'Config. Escolar' }, { to: '/padres', icon: HiUserGroup, label: 'Padres' }, { to: '/alumnos', icon: HiAcademicCap, label: 'Alumnos' }, { to: '/alertas-internas', icon: HiBell, label: 'Alertas internas' }, { to: '/matriculas', icon: HiClipboardList, label: 'Matrícula Digital' }, { to: '/libretas', icon: HiAcademicCap, label: 'Libretas' }, { to: '/horarios', icon: HiClock, label: 'Horarios' }, { to: '/horarios/espacios', icon: HiAcademicCap, label: 'Espacios físicos' }, { to: '/horarios/generar', icon: HiClock, label: 'Generar horario' }, { to: '/horarios/disponibilidad', icon: HiClock, label: 'Disponibilidad docente' }, { to: '/asistencia', icon: HiClipboardCheck, label: 'Asistencia' }, { to: '/agenda', icon: HiBookOpen, label: 'Agenda' }, { to: '/reportes-semanales', icon: HiDocumentText, label: 'Reportes' }, { to: '/mensajes', icon: HiChat, label: 'Chats' }, { to: '/comunicados', icon: HiSpeakerphone, label: 'Comunicados' }, { to: '/pensiones', icon: HiCurrencyDollar, label: 'Pensiones' }, { to: '/dashboard-pagos', icon: HiChartBar, label: 'Dashboard Pagos' }, { to: '/cobranzas', icon: HiMail, label: 'Cobranzas' }, { to: '/inventario', icon: HiArchive, label: 'Inventario y Ventas' }, { to: '/reporte-pagos', icon: HiChartBar, label: 'Reporte Pagos' }, { to: '/imprimir-recibos', icon: HiPrinter, label: 'Imprimir Recibos' }, { to: '/importar-pagos', icon: HiUpload, label: 'Importar Pagos' }, { to: '/anio-escolar', icon: HiCalendar, label: 'Año Escolar' }, { to: '/notificaciones', icon: HiBell, label: 'Notificaciones' }, { to: '/auditoria', icon: HiShieldCheck, label: 'Auditoría' },
  ],
  [ROLES.ADMIN]: [
    { to: '/dashboard', icon: HiHome, label: 'Dashboard' }, { to: '/padres', icon: HiUserGroup, label: 'Padres' }, { to: '/alumnos', icon: HiAcademicCap, label: 'Alumnos' }, { to: '/alertas-internas', icon: HiBell, label: 'Alertas internas' }, { to: '/matriculas', icon: HiClipboardList, label: 'Matrícula Digital' }, { to: '/config-escolar', icon: HiCog, label: 'Config. Escolar' }, { to: '/asistencia', icon: HiClipboardCheck, label: 'Asistencia' }, { to: '/agenda', icon: HiBookOpen, label: 'Agenda' }, { to: '/reportes-semanales', icon: HiDocumentText, label: 'Reportes' }, { to: '/mensajes', icon: HiChat, label: 'Chats' }, { to: '/comunicados', icon: HiSpeakerphone, label: 'Comunicados' }, { to: '/pensiones', icon: HiCurrencyDollar, label: 'Pensiones' }, { to: '/dashboard-pagos', icon: HiChartBar, label: 'Dashboard Pagos' }, { to: '/cobranzas', icon: HiMail, label: 'Cobranzas' }, { to: '/inventario', icon: HiArchive, label: 'Inventario y Ventas' }, { to: '/horarios', icon: HiClock, label: 'Horarios' }, { to: '/horarios/espacios', icon: HiAcademicCap, label: 'Espacios físicos' }, { to: '/reporte-pagos', icon: HiChartBar, label: 'Reporte Pagos' }, { to: '/imprimir-recibos', icon: HiPrinter, label: 'Imprimir Recibos' }, { to: '/importar-pagos', icon: HiUpload, label: 'Importar Pagos' }, { to: '/anio-escolar', icon: HiCalendar, label: 'Año Escolar' }, { to: '/notificaciones', icon: HiBell, label: 'Notificaciones' },
  ],
  [ROLES.TUTOR]: [{ to: '/dashboard', icon: HiHome, label: 'Dashboard' }, { to: '/libretas', icon: HiAcademicCap, label: 'Mis notas' }, { to: '/asistencia', icon: HiClipboardCheck, label: 'Asistencia Hoy' }, { to: '/agenda', icon: HiBookOpen, label: 'Agenda' }, { to: '/reportes-semanales', icon: HiDocumentText, label: 'Reportes' }, { to: '/mensajes', icon: HiChat, label: 'Chats' }, { to: '/notificaciones', icon: HiBell, label: 'Notificaciones' }],
  [ROLES.DOCENTE]: [{ to: '/dashboard', icon: HiHome, label: 'Dashboard' }, { to: '/libretas', icon: HiAcademicCap, label: 'Mis notas' }, { to: '/mi-horario-docente', icon: HiClock, label: 'Mi horario' }, { to: '/notificaciones', icon: HiBell, label: 'Notificaciones' }],
  [ROLES.PADRE]: [{ to: '/dashboard', icon: HiHome, label: 'Dashboard' }, { to: '/mi-horario', icon: HiClock, label: 'Horario de clases' }, { to: '/asistencia', icon: HiClipboardCheck, label: 'Asistencia' }, { to: '/agenda', icon: HiBookOpen, label: 'Agenda' }, { to: '/reportes-semanales', icon: HiDocumentText, label: 'Reportes' }, { to: '/mensajes', icon: HiChat, label: 'Chats' }, { to: '/comunicados', icon: HiSpeakerphone, label: 'Comunicados' }, { to: '/pensiones', icon: HiCurrencyDollar, label: 'Pensiones' }, { to: '/notificaciones', icon: HiBell, label: 'Notificaciones' }],
  [ROLES.PORTERIA]: [{ to: '/dashboard', icon: HiHome, label: 'Escaneo' }],
  [ROLES.PSICOLOGIA]: [{ to: '/dashboard', icon: HiHome, label: 'Dashboard' }, { to: '/comunicados', icon: HiSpeakerphone, label: 'Comunicados' }],
};

const navigationSections = [
  { id: 'inicio', label: 'Inicio', icon: HiHome, items: ['/dashboard'] },
  { id: 'academico', label: 'Académico', icon: HiAcademicCap, items: ['/alumnos', '/libretas', '/mi-horario-docente', '/mi-horario', { id: 'horarios', label: 'Horarios', icon: HiClock, items: ['/horarios', '/horarios/espacios', '/horarios/generar', '/horarios/disponibilidad'] }, '/anio-escolar'] },
  { id: 'asistencia-convivencia', label: 'Asistencia y convivencia', icon: HiClipboardCheck, items: ['/registro-asistencia', '/asistencia', '/alertas-internas', '/agenda', '/comunicados', '/notificaciones'] },
  { id: 'gestion-escolar', label: 'Gestión escolar', icon: HiCog, items: ['/usuarios', '/padres', '/matriculas', '/config-escolar'] },
  { id: 'pensiones-cobranzas', label: 'Pensiones y cobranzas', icon: HiCurrencyDollar, items: ['/pensiones', '/dashboard-pagos', '/cobranzas', '/reporte-pagos', '/imprimir-recibos', '/importar-pagos'] },
  { id: 'administracion', label: 'Administración', icon: HiCog, items: ['/inventario', '/reportes-semanales', '/auditoria'] },
  { id: 'comunicacion', label: 'Comunicación', icon: HiChat, items: ['/mensajes'] },
];

const isPathActive = (pathname, path) => pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [openSections, setOpenSections] = useState({});
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const tieneCapacidadDocente = (usuario.capacidades || []).includes('ACADEMICO_DOCENTE');
  const baseItems = menuItems[usuario.rol_codigo] || [];
  const items = tieneCapacidadDocente && !baseItems.some((item) => item.to === '/mi-horario-docente') ? [...baseItems, { to: '/mi-horario-docente', icon: HiClock, label: 'Mi horario' }] : baseItems;
  const itemsByPath = useMemo(() => new Map(items.map((item) => [item.to, item])), [items]);
  const hasVisibleItem = (entry) => typeof entry === 'string' ? itemsByPath.has(entry) : entry.items.some(hasVisibleItem);
  const isEntryActive = (entry) => typeof entry === 'string' ? isPathActive(location.pathname, entry) : entry.items.some(isEntryActive);

  useEffect(() => {
    setOpenSections((previous) => {
      const next = { ...previous };
      navigationSections.forEach((section) => {
        if (section.items.some(isEntryActive)) next[section.id] = true;
        section.items.filter((entry) => typeof entry !== 'string').forEach((group) => {
          if (group.items.some(isEntryActive)) next[group.id] = true;
        });
      });
      return next;
    });
  }, [location.pathname]);

  const toggle = (id) => setOpenSections((previous) => ({ ...previous, [id]: !previous[id] }));
  const linkClass = (isActive, nested = false) => `flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 ${nested ? 'px-3 py-2 ml-4' : 'px-3 py-2.5'} ${isActive ? 'bg-white/15 text-gold-300 shadow-sm backdrop-blur-sm border border-white/10' : 'text-primary-100 hover:bg-white/8 hover:text-white'}`;
  const renderLink = (path, nested = false) => {
    const item = itemsByPath.get(path);
    if (!item) return null;
    const Icon = item.icon;
    return <NavLink key={path} to={item.to} end onClick={onClose} className={({ isActive }) => linkClass(isActive, nested)}><Icon className="w-5 h-5 flex-shrink-0" />{item.label}</NavLink>;
  };
  const renderEntry = (entry) => {
    if (typeof entry === 'string') return renderLink(entry);
    if (!hasVisibleItem(entry)) return null;
    const groupIsActive = isEntryActive(entry);
    const groupOpen = openSections[entry.id] || groupIsActive;
    const Icon = entry.icon;
    return <div key={entry.id} className="space-y-0.5"><button type="button" onClick={() => toggle(entry.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${groupIsActive ? 'bg-white/10 text-gold-200' : 'text-primary-100 hover:bg-white/8 hover:text-white'}`} aria-expanded={groupOpen}><Icon className="w-5 h-5 flex-shrink-0" /><span className="flex-1 text-left">{entry.label}</span><HiChevronDown className={`w-4 h-4 transition-transform ${groupOpen ? 'rotate-180' : ''}`} /></button>{groupOpen && <div className="space-y-0.5">{entry.items.map((path) => renderLink(path, true))}</div>}</div>;
  };

  return <>
    {isOpen && <div className="fixed inset-0 bg-primary-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}
    <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar-gradient transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-primary-700/50"><div className="flex items-center gap-2.5"><img src={logoHarvard} alt="Colegio Harvard" className="w-10 h-10 rounded-full object-cover border-2 border-gold-400 shadow-gold" /><div><span className="text-sm font-bold text-white font-display tracking-wide">Colegio Harvard</span><div className="gold-line-left mt-0.5 w-20 opacity-60" /></div></div><button onClick={onClose} className="lg:hidden p-1 text-primary-200 hover:text-white transition-colors"><HiX className="w-5 h-5" /></button></div>
      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
        {navigationSections.map((section) => {
          const visibleEntries = section.items.filter(hasVisibleItem);
          if (!visibleEntries.length) return null;
          const sectionIsActive = section.items.some(isEntryActive);
          const sectionOpen = openSections[section.id] || sectionIsActive;
          const Icon = section.icon;
          return <div key={section.id} className="rounded-xl border border-white/5 bg-black/5 overflow-hidden"><button type="button" onClick={() => toggle(section.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors ${sectionIsActive ? 'text-gold-200 bg-white/10' : 'text-white/90 hover:bg-white/8'}`} aria-expanded={sectionOpen}><Icon className="w-5 h-5 flex-shrink-0" /><span className="flex-1 text-left">{section.label}</span><HiChevronDown className={`w-4 h-4 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} /></button>{sectionOpen && <div className="p-1.5 space-y-0.5">{visibleEntries.map(renderEntry)}</div>}</div>;
        })}
      </nav>
    </aside>
  </>;
};

export default Sidebar;

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { obtenerModalPendiente } from '../../services/notificacionesService';
import { aceptarModalPersonalizado } from '../../services/notifPersonalizadasService';
import PensionReminderModal from '../PensionReminderModal';
import CustomNotificationModal from '../CustomNotificationModal';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalPendiente, setModalPendiente] = useState(null);

  const checkModal = async () => {
    try {
      const { data } = await obtenerModalPendiente();
      if (data.data) setModalPendiente(data.data);
      else setModalPendiente(null);
    } catch {
      // silenciar — no bloquear la app
    }
  };

  useEffect(() => { checkModal(); }, []);

  const handleAceptarNotifPersonalizada = async () => {
    try {
      await aceptarModalPersonalizado(modalPendiente.id);
      setModalPendiente(null);
      // Verificar si hay más modales pendientes
      checkModal();
    } catch {
      // Si falla, mantener el modal visible para reintentar
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cream-100 bg-texture-linen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      {modalPendiente?.tipo === 'pension' && (
        <PensionReminderModal
          mesLabel={modalPendiente.mesLabel}
          alumnos={modalPendiente.alumnos}
          titulo={modalPendiente.titulo}
          cuerpo={modalPendiente.cuerpo}
          onClose={() => setModalPendiente(null)}
        />
      )}
      {modalPendiente?.tipo === 'notificacion_personalizada' && (
        <CustomNotificationModal
          titulo={modalPendiente.titulo}
          cuerpo={modalPendiente.cuerpo}
          onAccept={handleAceptarNotifPersonalizada}
        />
      )}
    </div>
  );
};

export default AppLayout;

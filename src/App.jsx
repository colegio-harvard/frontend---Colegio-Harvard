import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import ConfigEscolar from './pages/ConfigEscolar';
import Padres from './pages/Padres';
import Alumnos from './pages/Alumnos';
import Asistencia from './pages/Asistencia';
import Agenda from './pages/Agenda';
import AgendaAula from './pages/AgendaAula';
import AgendaAlumno from './pages/AgendaAlumno';
import Mensajes from './pages/Mensajes';
import MensajesAula from './pages/MensajesAula';
import MensajesAlumno from './pages/MensajesAlumno';
import Comunicados from './pages/Comunicados';
import ComunicadosAula from './pages/ComunicadosAula';
import ComunicadosAlumno from './pages/ComunicadosAlumno';
import Pensiones from './pages/Pensiones';
import Notificaciones from './pages/Notificaciones';
import ReportesSemanales from './pages/ReportesSemanales';
import ReportesAula from './pages/ReportesAula';
import ReportesAlumno from './pages/ReportesAlumno';
import AnioEscolar from './pages/AnioEscolar';
import Auditoria from './pages/Auditoria';
import CarnetView from './pages/CarnetView';
import AulaDetalle from './pages/AulaDetalle';
import AlumnoDetalle from './pages/AlumnoDetalle';
import { ROLES } from './utils/constants';

const { SUPER_ADMIN, ADMIN, TUTOR, PADRE, PORTERIA, PSICOLOGIA } = ROLES;

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: {
            background: '#FFFCF8',
            color: '#7F1D1D',
            border: '1px solid #F5EDE3',
            fontFamily: '"DM Sans", system-ui, sans-serif',
            boxShadow: '0 4px 14px rgba(197, 150, 58, 0.12)',
          },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error: { iconTheme: { primary: '#B71C1C', secondary: '#fff' } },
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/usuarios" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><Usuarios /></ProtectedRoute>
            } />

            <Route path="/config-escolar" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><ConfigEscolar /></ProtectedRoute>
            } />

            <Route path="/padres" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><Padres /></ProtectedRoute>
            } />

            <Route path="/alumnos" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><Alumnos /></ProtectedRoute>
            } />

            <Route path="/asistencia" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR, PADRE]}><Asistencia /></ProtectedRoute>
            } />

            <Route path="/agenda" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR, PADRE]}><Agenda /></ProtectedRoute>
            } />
            <Route path="/agenda/aula/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR]}><AgendaAula /></ProtectedRoute>
            } />
            <Route path="/agenda/alumno/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR, PADRE]}><AgendaAlumno /></ProtectedRoute>
            } />

            <Route path="/reportes-semanales" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR, PADRE]}><ReportesSemanales /></ProtectedRoute>
            } />
            <Route path="/reportes-semanales/aula/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR]}><ReportesAula /></ProtectedRoute>
            } />
            <Route path="/reportes-semanales/alumno/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR, PADRE]}><ReportesAlumno /></ProtectedRoute>
            } />

            <Route path="/mensajes" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR, PADRE]}><Mensajes /></ProtectedRoute>
            } />
            <Route path="/mensajes/aula/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR]}><MensajesAula /></ProtectedRoute>
            } />
            <Route path="/mensajes/alumno/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, TUTOR, PADRE]}><MensajesAlumno /></ProtectedRoute>
            } />

            <Route path="/comunicados" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, PADRE, PSICOLOGIA]}><Comunicados /></ProtectedRoute>
            } />
            <Route path="/comunicados/aula/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><ComunicadosAula /></ProtectedRoute>
            } />
            <Route path="/comunicados/alumno/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, PADRE, PSICOLOGIA]}><ComunicadosAlumno /></ProtectedRoute>
            } />

            <Route path="/pensiones" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN, PADRE]}><Pensiones /></ProtectedRoute>
            } />

            <Route path="/anio-escolar" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><AnioEscolar /></ProtectedRoute>
            } />

            <Route path="/aula/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><AulaDetalle /></ProtectedRoute>
            } />
            <Route path="/alumno/:id" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><AlumnoDetalle /></ProtectedRoute>
            } />
            <Route path="/carnet/:id_alumno" element={<CarnetView />} />
            <Route path="/notificaciones" element={<Notificaciones />} />

            <Route path="/auditoria" element={
              <ProtectedRoute roles={[SUPER_ADMIN]}><Auditoria /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

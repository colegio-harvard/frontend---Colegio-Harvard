import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { ROLES } from './utils/constants';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const ConfigEscolar = lazy(() => import('./pages/ConfigEscolar'));
const Padres = lazy(() => import('./pages/Padres'));
const Alumnos = lazy(() => import('./pages/Alumnos'));
const Asistencia = lazy(() => import('./pages/Asistencia'));
const Agenda = lazy(() => import('./pages/Agenda'));
const AgendaAula = lazy(() => import('./pages/AgendaAula'));
const AgendaAlumno = lazy(() => import('./pages/AgendaAlumno'));
const Mensajes = lazy(() => import('./pages/Mensajes'));
const MensajesAula = lazy(() => import('./pages/MensajesAula'));
const MensajesAlumno = lazy(() => import('./pages/MensajesAlumno'));
const Comunicados = lazy(() => import('./pages/Comunicados'));
const ComunicadosAula = lazy(() => import('./pages/ComunicadosAula'));
const ComunicadosAlumno = lazy(() => import('./pages/ComunicadosAlumno'));
const Pensiones = lazy(() => import('./pages/Pensiones'));
const ReportePagos = lazy(() => import('./pages/ReportePagos'));
const DashboardPagos = lazy(() => import('./pages/DashboardPagos'));
const Cobranzas = lazy(() => import('./pages/Cobranzas'));
const ImprimirRecibos = lazy(() => import('./pages/ImprimirRecibos'));
const ImportarPagosExcel = lazy(() => import('./pages/ImportarPagosExcel'));
const Notificaciones = lazy(() => import('./pages/Notificaciones'));
const ReportesSemanales = lazy(() => import('./pages/ReportesSemanales'));
const ReportesAula = lazy(() => import('./pages/ReportesAula'));
const ReportesAlumno = lazy(() => import('./pages/ReportesAlumno'));
const AnioEscolar = lazy(() => import('./pages/AnioEscolar'));
const Auditoria = lazy(() => import('./pages/Auditoria'));
const RegistroAsistencia = lazy(() => import('./pages/RegistroAsistencia'));
const CarnetView = lazy(() => import('./pages/CarnetView'));
const AulaDetalle = lazy(() => import('./pages/AulaDetalle'));
const AlumnoDetalle = lazy(() => import('./pages/AlumnoDetalle'));
const Libretas = lazy(() => import('./pages/Libretas'));

const { SUPER_ADMIN, ADMIN, TUTOR, DOCENTE, PADRE, PORTERIA, PSICOLOGIA } = ROLES;

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
        <Suspense fallback={<div className="min-h-screen bg-cream-50" aria-label="Cargando módulo" />}>
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

            <Route path="/dashboard-pagos" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><DashboardPagos /></ProtectedRoute>
            } />

            <Route path="/cobranzas" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><Cobranzas /></ProtectedRoute>
            } />

            <Route path="/reporte-pagos" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><ReportePagos /></ProtectedRoute>
            } />

            <Route path="/imprimir-recibos" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><ImprimirRecibos /></ProtectedRoute>
            } />

            <Route path="/importar-pagos" element={
              <ProtectedRoute roles={[SUPER_ADMIN, ADMIN]}><ImportarPagosExcel /></ProtectedRoute>
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

            <Route path="/registro-asistencia" element={
              <ProtectedRoute roles={[SUPER_ADMIN]}><RegistroAsistencia /></ProtectedRoute>
            } />

            <Route path="/auditoria" element={
              <ProtectedRoute roles={[SUPER_ADMIN]}><Auditoria /></ProtectedRoute>
            } />

            <Route path="/libretas" element={
              <ProtectedRoute roles={[SUPER_ADMIN, TUTOR, DOCENTE]}><Libretas /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;


import { useState, useEffect, useRef, lazy, Suspense, Component } from 'react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { registrarAsistencia, historialPorteria } from '../../services/asistenciaService';
import { formatHora } from '../../utils/formatters';
import { HiQrcode, HiKey } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';

const QrCameraScanner = lazy(() => import('../../components/porteria/QrCameraScanner'));

class CameraErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 font-medium mb-1">Cámara no disponible</p>
          <p className="text-xs text-primary-800/50">Ocurrió un error inesperado al iniciar la cámara</p>
          <p className="text-xs text-primary-800/40 mt-2">Use el modo manual para ingresar el código del alumno</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const DashboardPorteria = () => {
  const [modo, setModo] = useState('CAMARA'); // CAMARA | CODIGO
  const [codigoAlumno, setCodigoAlumno] = useState('');
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const codigoRef = useRef(null);

  const cargarHistorial = async () => {
    try {
      const { data } = await historialPorteria();
      setHistorial(data.data || []);
    } catch {
      // silenciar
    }
  };

  const registrar = async (payload) => {
    if (loading) return;
    setLoading(true);
    // Pausar cámara mientras se procesa
    if (modo === 'CAMARA') setScannerPaused(true);
    try {
      const { data } = await registrarAsistencia(payload);
      setUltimoRegistro(data.data);
      toast.success(`${data.data.tipo_evento === 'CHECKIN' ? 'INGRESO' : 'SALIDA'} - ${data.data.alumno}`);
      setCodigoAlumno('');
      cargarHistorial();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
      // Reanudar cámara después de un breve delay
      if (modo === 'CAMARA') {
        setTimeout(() => setScannerPaused(false), 1500);
      }
    }
  };

  const handleCameraScan = (decodedText) => {
    if (loading) return;
    registrar({ qr_token: decodedText });
  };

  const handleCodigoSubmit = (e) => {
    e.preventDefault();
    if (!codigoAlumno.trim()) return;
    registrar({ codigo_alumno: codigoAlumno.trim() });
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  useEffect(() => {
    if (modo === 'CODIGO') {
      setTimeout(() => codigoRef.current?.focus(), 100);
    }
  }, [modo]);

  // WebSocket: actualizar historial en tiempo real
  useSocket('asistencia:evento', () => cargarHistorial());

  const btnBase = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm';
  const btnActive = 'bg-primary-600 text-white shadow-crimson';
  const btnInactive = 'bg-cream-100 text-primary-800/70 hover:bg-cream-200';

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <h1 className="page-title mb-4">Control de Ingreso / Salida</h1>

      {/* Selector de modo */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setModo('CAMARA')}
          className={`${btnBase} ${modo === 'CAMARA' ? btnActive : btnInactive}`}
        >
          <HiQrcode className="w-5 h-5" /> Escanear QR
        </button>
        <button
          onClick={() => setModo('CODIGO')}
          className={`${btnBase} ${modo === 'CODIGO' ? btnActive : btnInactive}`}
        >
          <HiKey className="w-5 h-5" /> Código Manual
        </button>
      </div>

      {/* Área de escaneo / entrada */}
      <Card className="mb-4">
        {modo === 'CAMARA' ? (
          <div>
            <label className="form-label mb-2">Apunte la cámara al QR del carnet</label>
            <CameraErrorBoundary>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16 bg-primary-900/5 rounded-lg">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-primary-800/50">Cargando escáner...</p>
                    </div>
                  </div>
                }
              >
                <QrCameraScanner onScan={handleCameraScan} paused={scannerPaused} />
              </Suspense>
            </CameraErrorBoundary>
            {loading && (
              <div className="mt-3 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                  <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                  Registrando...
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCodigoSubmit}>
            <label className="form-label">Ingrese el código del alumno</label>
            <input
              ref={codigoRef}
              type="text"
              value={codigoAlumno}
              onChange={(e) => setCodigoAlumno(e.target.value.toUpperCase())}
              placeholder="Ej: ALU-2026-001"
              className="input-field text-lg text-center tracking-widest"
              maxLength={50}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !codigoAlumno.trim()}
              className="mt-3 w-full py-2.5 bg-crimson-gradient text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium shadow-crimson transition-all"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </form>
        )}
      </Card>

      {/* Último registro */}
      {ultimoRegistro && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50/50">
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-700 font-display">
              {ultimoRegistro.tipo_evento === 'CHECKIN' ? 'INGRESO' : 'SALIDA'}
            </p>
            <p className="text-xl font-semibold text-primary-800 mt-1">{ultimoRegistro.alumno}</p>
            {ultimoRegistro.aula && <p className="text-sm text-gold-600">{ultimoRegistro.aula}</p>}
            <p className="text-sm text-primary-800/60 mt-1">{formatHora(ultimoRegistro.fecha_hora)}</p>
          </div>
        </Card>
      )}

      {/* Historial */}
      <Card title="Últimos registros">
        {historial.length === 0 ? (
          <p className="text-center text-cream-400 py-4 font-display">Sin registros recientes</p>
        ) : (
          <div className="space-y-2">
            {historial.map((reg) => (
              <div key={reg.id} className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-primary-800">{reg.alumno?.nombre_completo || 'Alumno'}</p>
                  <p className="text-xs text-gold-600">{reg.metodo} {reg.alumno?.aula ? `- ${reg.alumno.aula}` : ''}</p>
                </div>
                <div className="text-right">
                  <Badge variant={reg.tipo_evento === 'CHECKIN' ? 'success' : 'info'}>
                    {reg.tipo_evento === 'CHECKIN' ? 'Ingreso' : 'Salida'}
                  </Badge>
                  <p className="text-xs text-primary-800/50 mt-1">{formatHora(reg.fecha_hora)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardPorteria;

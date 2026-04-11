import { useState, useEffect, useRef, lazy, Suspense, Component } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { registrarAsistencia, historialPorteria } from '../services/asistenciaService';
import { formatHora } from '../utils/formatters';
import { HiQrcode, HiKey } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { fileUrl } from '../utils/constants';
import { playSuccessBeep, playErrorBeep } from '../utils/sounds';

const QrCameraScanner = lazy(() => import('../components/porteria/QrCameraScanner'));

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
          <p className="text-sm text-red-600 font-medium mb-1">Camara no disponible</p>
          <p className="text-xs text-primary-800/40 mt-2">Use el modo manual para ingresar el codigo del alumno</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const COOLDOWN_SECONDS = 5;

const RegistroAsistencia = () => {
  const [modo, setModo] = useState('CAMARA');
  const [codigoAlumno, setCodigoAlumno] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [cooldown, setCooldown] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [historial, setHistorial] = useState([]);
  const codigoRef = useRef(null);
  const cooldownTimerRef = useRef(null);

  const cargarHistorial = async () => {
    try {
      const { data } = await historialPorteria();
      setHistorial(data.data || []);
    } catch {
      // silenciar
    }
  };

  const registrar = async (payload) => {
    if (loading || cooldown) return;
    setLoading(true);
    if (modo === 'CAMARA') setScannerPaused(true);
    try {
      const { data } = await registrarAsistencia(payload);
      playSuccessBeep();
      setScanResult(data.data);
      setCodigoAlumno('');
      cargarHistorial();

      if (modo === 'CAMARA') {
        let remaining = COOLDOWN_SECONDS;
        setCooldown({
          alumno: data.data.alumno,
          tipo_evento: data.data.tipo_evento,
          aula: data.data.aula,
          foto: data.data.foto,
          dni: data.data.dni,
          segundos: remaining,
        });
        cooldownTimerRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            clearInterval(cooldownTimerRef.current);
            setCooldown(null);
            setScannerPaused(false);
          } else {
            setCooldown(prev => prev ? { ...prev, segundos: remaining } : null);
          }
        }, 1000);
      } else {
        toast.success(`${data.data.tipo_evento === 'CHECKIN' ? 'INGRESO' : 'SALIDA'} - ${data.data.alumno}`);
      }
    } catch (err) {
      playErrorBeep();
      toast.error(err.response?.data?.error || 'Error al registrar');
      if (modo === 'CAMARA') {
        setTimeout(() => setScannerPaused(false), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCameraScan = (decodedText) => {
    if (loading || cooldown) return;
    registrar({ qr_token: decodedText });
  };

  const handleCodigoSubmit = (e) => {
    e.preventDefault();
    if (!codigoAlumno.trim()) return;
    registrar({ codigo_alumno: codigoAlumno.trim() });
  };

  useEffect(() => {
    cargarHistorial();
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (modo === 'CODIGO') {
      setTimeout(() => codigoRef.current?.focus(), 100);
    }
  }, [modo]);

  useSocket('asistencia:evento', () => cargarHistorial());

  const btnBase = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm';
  const btnActive = 'bg-primary-600 text-white shadow-crimson';
  const btnInactive = 'bg-cream-100 text-primary-800/70 hover:bg-cream-200';

  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-4">Registro de Asistencia</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Columna izquierda: Escaner */}
        <div className="space-y-4">
          {/* Selector de modo */}
          <div className="flex gap-2">
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
              <HiKey className="w-5 h-5" /> Codigo Manual
            </button>
          </div>

          {/* Area de escaneo / entrada */}
          <Card>
            {modo === 'CAMARA' ? (
              <div>
                <label className="form-label mb-2">Apunte la camara al QR del carnet</label>
                <div className="relative">
                  <CameraErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center py-16 bg-primary-900/5 rounded-lg">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-sm text-primary-800/50">Cargando escaner...</p>
                          </div>
                        </div>
                      }
                    >
                      <QrCameraScanner onScan={handleCameraScan} paused={scannerPaused} />
                    </Suspense>
                  </CameraErrorBoundary>

                  {/* Overlay de procesando */}
                  {loading && !cooldown && (
                    <div className="absolute inset-0 bg-primary-900/70 rounded-lg flex items-center justify-center z-10">
                      <div className="text-center text-white">
                        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm font-medium">Registrando asistencia...</p>
                      </div>
                    </div>
                  )}

                  {/* Overlay de confirmacion con bloqueo temporal */}
                  {cooldown && (
                    <div className="absolute inset-0 bg-emerald-600 rounded-lg flex items-center justify-center z-10">
                      <div className="text-center text-white px-6">
                        {cooldown.foto ? (
                          <div className="relative w-20 h-20 mx-auto mb-3">
                            <img src={fileUrl(cooldown.foto)} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-white/30" />
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center">
                              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <p className="text-xl font-bold font-display tracking-wide">
                          {cooldown.tipo_evento === 'CHECKIN' ? 'INGRESO REGISTRADO' : 'SALIDA REGISTRADA'}
                        </p>
                        <p className="text-lg font-semibold mt-1 text-white/90">{cooldown.alumno}</p>
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full text-xs text-white/80">
                          <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Escaner disponible en {cooldown.segundos}s
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCodigoSubmit}>
                <label className="form-label">Ingrese el codigo del alumno</label>
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
        </div>

        {/* Columna derecha: Informacion del alumno */}
        <div>
          {scanResult ? (
            <Card className="border-emerald-200 bg-emerald-50/30 h-full">
              <div className="flex flex-col items-center justify-center py-6">
                {scanResult.foto ? (
                  <img src={fileUrl(scanResult.foto)} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-emerald-300 shadow-md mb-4" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-md">
                    {scanResult.alumno?.charAt(0)}
                  </div>
                )}
                <h3 className="text-2xl font-bold text-primary-800 font-display text-center">{scanResult.alumno}</h3>
                {scanResult.dni && (
                  <p className="text-base text-primary-800/60 mt-2">DNI: {scanResult.dni}</p>
                )}
                {scanResult.aula && (
                  <p className="text-sm text-gold-600 mt-1">{scanResult.aula}</p>
                )}
                <div className="mt-4">
                  <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-base font-bold ${
                    scanResult.tipo_evento === 'CHECKIN'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {scanResult.tipo_evento === 'CHECKIN' ? 'INGRESO REGISTRADO' : 'SALIDA REGISTRADA'}
                  </span>
                </div>
                <p className="text-sm text-primary-800/50 mt-3">{formatHora(scanResult.fecha_hora)}</p>
              </div>
            </Card>
          ) : (
            <Card className="h-full">
              <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="w-20 h-20 rounded-full bg-cream-100 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-cream-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-base text-cream-400 font-medium font-display">Informacion del Alumno</p>
                <p className="text-sm text-cream-300 mt-1">Escanee un QR o ingrese un codigo</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Historial */}
      <Card title="Ultimos registros">
        {historial.length === 0 ? (
          <p className="text-center text-cream-400 py-4 font-display">Sin registros recientes</p>
        ) : (
          <div className="space-y-2">
            {historial.map((reg) => (
              <div key={reg.id} className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0">
                <div className="flex items-center gap-3">
                  {reg.alumno?.foto_url ? (
                    <img src={fileUrl(reg.alumno.foto_url)} alt="" className="w-9 h-9 rounded-full object-cover border border-cream-200" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-cream-400">{reg.alumno?.nombre_completo?.charAt(0) || '?'}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-primary-800">{reg.alumno?.nombre_completo || 'Alumno'}</p>
                    <p className="text-xs text-gold-600">{reg.metodo} {reg.alumno?.aula ? `- ${reg.alumno.aula}` : ''}</p>
                  </div>
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

export default RegistroAsistencia;

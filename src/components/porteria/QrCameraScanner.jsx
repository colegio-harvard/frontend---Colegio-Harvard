import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QR_REGION_ID = 'qr-camera-region';

const QrCameraScanner = ({ onScan, paused = false }) => {
  const scannerRef = useRef(null);
  const lastResultRef = useRef(null);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Verificar que el navegador soporte acceso a cámara
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Este navegador no soporta acceso a la cámara. Asegúrese de usar HTTPS.');
      return;
    }

    let scanner;
    try {
      scanner = new Html5Qrcode(QR_REGION_ID);
    } catch (err) {
      setError(err?.message || 'No se pudo inicializar el escáner');
      return;
    }
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'user' },
        { fps: 10, qrbox: { width: 220, height: 220 }, disableFlip: false },
        (decodedText) => {
          // Evitar escaneos duplicados consecutivos
          if (decodedText === lastResultRef.current) return;
          lastResultRef.current = decodedText;
          onScan(decodedText);
          // Resetear después de 3s para permitir re-escaneo
          setTimeout(() => {
            lastResultRef.current = null;
          }, 6000);
        },
        () => {} // ignorar errores de frames sin QR
      )
      .then(() => {
        if (mounted) setCameraReady(true);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'No se pudo acceder a la cámara');
      });

    return () => {
      mounted = false;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pausar/reanudar sin detener la cámara
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || !cameraReady) return;
    try {
      if (paused) scanner.pause(false);
      else scanner.resume();
    } catch {
      // puede fallar si ya está en el estado correcto
    }
  }, [paused, cameraReady]);

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-red-600 font-medium mb-1">Cámara no disponible</p>
        <p className="text-xs text-primary-800/50">{error}</p>
        <p className="text-xs text-primary-800/40 mt-2">Use el modo manual para ingresar el código del alumno</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        id={QR_REGION_ID}
        className="rounded-lg overflow-hidden [&>video]:!rounded-lg [&_#qr-shaded-region]:!border-[3px] [&_#qr-shaded-region]:!border-emerald-400"
      />
      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-900/80 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-white/80">Iniciando cámara...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QrCameraScanner;

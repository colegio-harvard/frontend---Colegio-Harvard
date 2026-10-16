import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import HorarioImprimible from '../components/horarios/HorarioImprimible';
import HorarioExportActions from '../components/horarios/HorarioExportActions';
import { obtenerMiHorarioDocente } from '../services/horariosService';

const archivoHorarioDocente = (data = {}) => `Horario_Docente_${String(data.docente || 'Colegio_Harvard')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '_')
  .replace(/^_|_$/g, '')}_${data.anio || ''}`;

export default function HorarioDocente() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const documentoImprimibleRef = useRef(null);

  useEffect(() => {
    obtenerMiHorarioDocente()
      .then((respuesta) => setData(respuesta.data.data))
      .catch((error) => toast.error(error.response?.data?.error || 'No se pudo cargar tu horario.'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className="card">Cargando horario…</div>;
  const clases = data?.clases || [];
  const encabezado = { persona: data?.docente, anio: data?.anio };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="page-title">Mi horario de clases</h1>
          <p className="page-subtitle">{data?.docente || 'Docente'}{data?.anio && ` · Año escolar ${data.anio}`}</p>
        </div>
        {!!clases.length && <HorarioExportActions documentRef={documentoImprimibleRef} archivoBase={archivoHorarioDocente(data)} />}
      </div>
      {!clases.length ? <div className="card">No tienes clases publicadas actualmente.</div> : <HorarioImprimible encabezado={encabezado} clases={clases} modo="agenda" mostrarDocente={false} />}
      {!!clases.length && <HorarioImprimible ref={documentoImprimibleRef} className="horario-documento--origen" encabezado={encabezado} clases={clases} modo="agenda" mostrarDocente={false} />}
    </div>
  );
}

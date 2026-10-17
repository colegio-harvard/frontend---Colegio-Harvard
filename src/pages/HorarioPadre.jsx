import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { HiAcademicCap, HiClock } from 'react-icons/hi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import HorarioImprimible from '../components/horarios/HorarioImprimible';
import HorarioExportActions from '../components/horarios/HorarioExportActions';
import HorarioZoomable from '../components/horarios/HorarioZoomable';
import { obtenerMisHorarios } from '../services/horariosService';

const textoError = (error) => error.response?.data?.error || 'No se pudo cargar el horario. Inténtelo nuevamente.';
const archivoHorario = (aula = {}) => `Horario_${[aula.nivel, aula.grado, aula.seccion, aula.anio]
  .filter(Boolean)
  .join('_')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '_')
  .replace(/^_|_$/g, '')}`;

export default function HorarioPadre() {
  const [hijos, setHijos] = useState([]);
  const [seleccion, setSeleccion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState('');
  const documentoImprimibleRef = useRef(null);

  useEffect(() => {
    obtenerMisHorarios()
      .then((respuesta) => setHijos(respuesta.data.data || []))
      .catch((error) => {
        const mensaje = textoError(error);
        setFallo(mensaje);
        toast.error(mensaje);
      })
      .finally(() => setLoading(false));
  }, []);

  const hijo = useMemo(() => hijos[seleccion] || null, [hijos, seleccion]);

  if (loading) return <div className="py-20"><LoadingSpinner /></div>;
  if (fallo) return <div className="card py-14 text-center"><HiClock className="mx-auto mb-3 h-12 w-12 text-primary-300" /><h1 className="page-title text-2xl">No fue posible cargar el horario</h1><p className="mt-2 text-primary-700/70">{fallo}</p></div>;
  if (!hijos.length) return <div className="card py-14 text-center"><HiAcademicCap className="mx-auto mb-3 h-12 w-12 text-gold-500" /><h1 className="page-title text-2xl">Sin estudiantes vinculados</h1><p className="mt-2 text-primary-700/70">No se encontraron estudiantes vinculados a esta cuenta.</p></div>;

  const horarioPublicado = hijo?.horarioPublicado;
  const encabezado = {
    nivel: hijo?.aula?.nivel,
    grado: hijo?.aula?.grado,
    seccion: hijo?.aula?.seccion,
    anio: hijo?.aula?.anio,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Horario de clases</h1>
          <p className="page-subtitle">Consulta el horario publicado por el colegio.</p>
        </div>
        {horarioPublicado && <HorarioExportActions documentRef={documentoImprimibleRef} archivoBase={archivoHorario(hijo.aula)} />}
      </div>

      {hijos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {hijos.map((item, indice) => (
            <button key={item.alumno?.id || indice} type="button" onClick={() => setSeleccion(indice)} className={`shrink-0 rounded-xl border px-4 py-3 text-left transition-colors ${indice === seleccion ? 'border-gold-400 bg-gold-50 text-primary-800' : 'border-cream-200 bg-white text-primary-700 hover:bg-cream-50'}`}>
              <b className="block">{item.alumno?.nombre || 'Estudiante'}</b>
              <span className="text-xs">{item.aula?.grado} {item.aula?.seccion}</span>
            </button>
          ))}
        </div>
      )}

      <section className="card">
        <div className="mb-5 flex flex-wrap justify-between gap-4 border-b border-cream-200 pb-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-primary-800">{hijo?.alumno?.nombre || 'Estudiante'}</h2>
            <p className="mt-1 text-primary-700/75">{hijo?.aula?.nivel} · {hijo?.aula?.grado} {hijo?.aula?.seccion}</p>
            <p className="text-sm text-primary-700/60">Año escolar {hijo?.aula?.anio || '—'}</p>
          </div>
          {horarioPublicado && <div><Badge variant="success">PUBLICADO</Badge></div>}
        </div>
        {horarioPublicado ? (
          <HorarioZoomable>
            <HorarioImprimible encabezado={encabezado} bloques={hijo.bloques || []} clases={hijo.clases || []} usosInstitucionales={hijo.usos_institucionales || []} mostrarDocente />
          </HorarioZoomable>
        ) : (
          <div className="rounded-xl border border-gold-200 bg-gold-50 p-8 text-center"><HiClock className="mx-auto mb-3 h-10 w-10 text-gold-600" /><h3 className="font-display text-xl text-primary-800">Horario aún no disponible</h3><p className="mt-2 text-primary-700/70">El horario de clases de este estudiante todavía no ha sido publicado por el colegio.</p></div>
        )}
      </section>

      {horarioPublicado && <HorarioImprimible ref={documentoImprimibleRef} className="horario-documento--origen" encabezado={encabezado} bloques={hijo.bloques || []} clases={hijo.clases || []} usosInstitucionales={hijo.usos_institucionales || []} mostrarDocente />}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import HorarioEspacioImprimible from '../components/horarios/HorarioEspacioImprimible';
import HorarioExportActions from '../components/horarios/HorarioExportActions';
import { listarEspacios, obtenerOcupacionEspacio } from '../services/horariosService';
import { listarAños } from '../services/configEscolarService';

const archivo = (data) => `Horario_Espacio_${String(data?.espacio?.nombre || 'Colegio_Harvard').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}_${data?.anio?.anio || ''}`;

export default function HorarioEspacio() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [espacios, setEspacios] = useState([]);
  const [anios, setAnios] = useState([]);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const documento = useRef(null);
  const idAnio = searchParams.get('anio');

  useEffect(() => {
    Promise.all([listarEspacios({ incluir_inactivos: true }), listarAños()])
      .then(([respuestaEspacios, respuestaAnios]) => {
        setEspacios(respuestaEspacios.data.data || []);
        const disponibles = respuestaAnios.data.data || [];
        setAnios(disponibles);
        if (!idAnio) {
          const activo = disponibles.find((anio) => anio.activo) || disponibles[0];
          if (activo) setSearchParams({ anio: String(activo.id) }, { replace: true });
        }
      })
      .catch(() => toast.error('No se pudieron cargar los filtros del espacio.'));
  }, []);

  useEffect(() => {
    if (!id || !idAnio) return;
    setCargando(true);
    obtenerOcupacionEspacio(id, { id_anio_escolar: idAnio })
      .then((respuesta) => setData(respuesta.data.data))
      .catch((error) => { setData(null); toast.error(error.response?.data?.error || 'No se pudo cargar el horario del espacio.'); })
      .finally(() => setCargando(false));
  }, [id, idAnio]);

  const cambiarEspacio = (event) => { window.location.assign(`/horarios/espacios/${event.target.value}/horario${idAnio ? `?anio=${idAnio}` : ''}`); };
  const cambiarAnio = (event) => setSearchParams({ anio: event.target.value });

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="page-title">Horario por espacio físico</h1><p className="page-subtitle">Uso vigente de ambientes en horarios publicados.</p></div>{data && <HorarioExportActions documentRef={documento} archivoBase={archivo(data)} />}</div>
    <div className="card-harvard grid gap-4 p-5 md:grid-cols-2"><label className="text-sm font-semibold text-primary-800">Año escolar<select className="input-field mt-1" value={idAnio || ''} onChange={cambiarAnio}>{anios.map((anio) => <option key={anio.id} value={anio.id}>{anio.anio}{anio.activo ? ' · Activo' : ''}</option>)}</select></label><label className="text-sm font-semibold text-primary-800">Espacio físico<select className="input-field mt-1" value={id} onChange={cambiarEspacio}>{espacios.map((espacio) => <option key={espacio.id} value={espacio.id}>{espacio.nombre}{espacio.activo ? '' : ' · Inactivo'}</option>)}</select></label></div>
    {cargando ? <div className="card">Cargando horario del espacio…</div> : data ? <><div className="overflow-x-auto"><HorarioEspacioImprimible data={data} /></div><HorarioEspacioImprimible ref={documento} data={data} className="horario-documento--origen" /></> : <div className="card">No hay información disponible para este espacio.</div>}
    <Link className="btn-secondary inline-flex" to="/horarios/espacios">Volver a espacios físicos</Link>
  </div>;
}

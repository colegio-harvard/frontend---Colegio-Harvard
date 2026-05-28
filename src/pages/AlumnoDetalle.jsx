import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { obtenerAlumno } from '../services/alumnosService';
import { HiArrowLeft, HiIdentification, HiUserGroup, HiAcademicCap, HiPhone, HiQrcode } from 'react-icons/hi';
import { fileUrl } from '../utils/constants';
import toast from 'react-hot-toast';

const AlumnoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alumno, setAlumno] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlumno = async () => {
      try {
        const { data } = await obtenerAlumno(id);
        setAlumno(data.data);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Error al cargar alumno');
      } finally {
        setLoading(false);
      }
    };
    fetchAlumno();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (!alumno) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 text-primary-800/70 hover:text-primary-800">
          <HiArrowLeft className="w-5 h-5" /> Volver
        </button>
        <Card><p className="text-center text-gold-600 py-8">No se pudo cargar el alumno</p></Card>
      </div>
    );
  }

  // Extraer datos del formato raw Prisma
  const aula = alumno.tbl_aulas;
  const grado = aula?.tbl_grados;
  const nivel = grado?.tbl_niveles;
  const padre = alumno.tbl_padres_alumnos?.tbl_padres;
  const carnet = alumno.tbl_carnets;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(aula ? `/aula/${aula.id}` : -1)} className="p-2 text-primary-800/70 hover:bg-cream-100 rounded-lg transition-colors">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-primary-800 font-display">Vista del Alumno</h1>
          <p className="text-sm text-gold-600">Informacion completa</p>
        </div>
      </div>

      {/* Header del alumno */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          {alumno.foto_url ? (
            <img src={fileUrl(alumno.foto_url)} alt={alumno.nombre_completo}
              className="w-20 h-20 rounded-full object-cover border-3 border-gold-300 shadow-gold" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
              <span className="text-white font-bold text-2xl">{alumno.nombre_completo?.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-primary-800 font-display">{alumno.nombre_completo}</h2>
              <Badge variant={alumno.estado === 'ACTIVO' ? 'success' : 'danger'}>{alumno.estado}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-gold-600">
                <HiAcademicCap className="w-4 h-4" />
                <span>Codigo: <span className="font-medium text-primary-800">{alumno.codigo_alumno}</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-gold-600">
                <HiIdentification className="w-4 h-4" />
                <span>DNI: <span className="font-medium text-primary-800">{alumno.dni || '-'}</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-gold-600">
                <HiIdentification className="w-4 h-4" />
                <span>{nivel?.nombre || '-'} - {grado?.nombre || '-'} {aula?.seccion || ''}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Card Padre */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600">
              <HiUserGroup className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-primary-800 font-display">Padre / Madre</h3>
          </div>
          {padre ? (
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gold-600">Nombre Completo</p>
                <p className="text-sm font-medium text-primary-800">{padre.nombre_completo}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gold-600">DNI</p>
                  <p className="text-sm font-medium text-primary-800">{padre.dni}</p>
                </div>
                <div>
                  <p className="text-xs text-gold-600">Celular</p>
                  <div className="flex items-center gap-1">
                    <HiPhone className="w-3.5 h-3.5 text-gold-600" />
                    <p className="text-sm font-medium text-primary-800">{padre.celular}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-cream-400 italic py-4 text-center">Sin padre/madre vinculado</p>
          )}
        </Card>

        {/* Card Carnet */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500">
                <HiQrcode className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-primary-800 font-display">Carnet</h3>
            </div>
            {carnet && (
              <button onClick={() => navigate(`/carnet/${alumno.id}`)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gold-700 bg-gold-50 rounded-lg hover:bg-gold-100 border border-gold-200 transition-colors">
                <HiIdentification className="w-3.5 h-3.5" /> Ver Carnet
              </button>
            )}
          </div>
          {carnet ? (
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gold-600">QR Token</p>
                <p className="text-xs font-mono text-primary-800/70 break-all bg-cream-50 px-2 py-1.5 rounded">{carnet.qr_token}</p>
              </div>
              <div>
                <p className="text-xs text-gold-600">Version</p>
                <p className="text-sm font-medium text-primary-800">{carnet.version_carnet}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-cream-400 italic py-4 text-center">Sin carnet emitido</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AlumnoDetalle;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileUrl } from '../utils/constants';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { obtenerAula } from '../services/configEscolarService';
import { HiArrowLeft, HiAcademicCap, HiUser, HiUserGroup, HiChevronRight, HiSpeakerphone } from 'react-icons/hi';
import toast from 'react-hot-toast';

const ComunicadosAula = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aula, setAula] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAula = async () => {
      try {
        const { data } = await obtenerAula(id);
        setAula(data.data);
      } catch {
        toast.error('Error al cargar aula');
      } finally {
        setLoading(false);
      }
    };
    fetchAula();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (!aula) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => navigate('/comunicados')} className="flex items-center gap-2 mb-4 text-primary-800/70 hover:text-primary-800">
          <HiArrowLeft className="w-5 h-5" /> Volver
        </button>
        <Card><p className="text-center text-gold-600 py-8">No se pudo cargar el aula</p></Card>
      </div>
    );
  }

  const alumnos = (aula.alumnos || []).filter(a => a.estado === 'ACTIVO');

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/comunicados')} className="p-2 text-primary-800/70 hover:bg-cream-100 rounded-lg transition-colors">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-primary-800 font-display">{aula.grado?.nombre} "{aula.seccion}"</h1>
          <p className="text-sm text-gold-600">{aula.grado?.nivel?.nombre} — Comunicados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 shadow-md"><HiAcademicCap className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-xs text-gold-600 font-medium">Nivel / Grado</p>
              <p className="text-sm font-semibold text-primary-800">{aula.grado?.nivel?.nombre}</p>
              <p className="text-sm text-primary-800/70">{aula.grado?.nombre} - Seccion {aula.seccion}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500 shadow-md"><HiUser className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-xs text-gold-600 font-medium">Tutor</p>
              <p className="text-sm font-semibold text-primary-800">{aula.tutor?.nombres || 'Sin asignar'}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 shadow-md"><HiUserGroup className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-xs text-gold-600 font-medium">Total Alumnos</p>
              <p className="text-2xl font-bold text-primary-800 font-display">{alumnos.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {alumnos.length === 0 ? (
        <Card><p className="text-center text-gold-600 py-8">No hay alumnos activos en esta aula</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alumnos.map(alumno => (
            <button key={alumno.id} onClick={() => navigate(`/comunicados/alumno/${alumno.id}`)} className="text-left group">
              <Card className="hover:shadow-lg hover:border-gold-300 transition-all duration-200 h-full">
                <div className="flex items-center gap-3">
                  {alumno.foto_url ? (
                    <img src={fileUrl(alumno.foto_url)} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-gold-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
                      <span className="text-white text-sm font-bold">{alumno.nombre_completo?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">{alumno.nombre_completo}</p>
                    <p className="text-xs text-gold-600">{alumno.codigo_alumno}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <HiSpeakerphone className="w-4 h-4 text-cream-300 group-hover:text-gold-500 transition-colors" />
                    <HiChevronRight className="w-4 h-4 text-cream-300 group-hover:text-gold-500 transition-colors" />
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComunicadosAula;

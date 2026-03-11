import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileUrl } from '../utils/constants';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { obtenerAula } from '../services/configEscolarService';
import { HiArrowLeft, HiEye, HiAcademicCap, HiUserGroup, HiUser } from 'react-icons/hi';
import toast from 'react-hot-toast';

const AulaDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aula, setAula] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAula = async () => {
      try {
        const { data } = await obtenerAula(id);
        setAula(data.data);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Error al cargar aula');
      } finally {
        setLoading(false);
      }
    };
    fetchAula();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (!aula) {
    return (
      <div>
        <button onClick={() => navigate('/config-escolar')} className="flex items-center gap-2 mb-4 text-primary-800/70 hover:text-primary-800">
          <HiArrowLeft className="w-5 h-5" /> Volver
        </button>
        <Card><p className="text-center text-gold-600 py-8">No se pudo cargar el aula</p></Card>
      </div>
    );
  }

  const alumnosColumns = [
    { header: '#', render: (_, i) => i + 1 },
    { header: 'Alumno', sortValue: (r) => r.nombre_completo, render: (r) => (
      <div className="flex items-center gap-2.5">
        {r.foto_url ? (
          <img src={fileUrl(r.foto_url)} alt="" className="w-8 h-8 rounded-full object-cover border border-gold-200" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
            <span className="text-white text-xs font-bold">{r.nombre_completo?.charAt(0)}</span>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-primary-800">{r.nombre_completo}</p>
          <p className="text-xs text-gold-600">{r.codigo_alumno}</p>
        </div>
      </div>
    )},
    { header: 'Estado', sortValue: (r) => r.estado, render: (r) => (
      <Badge variant={r.estado === 'ACTIVO' ? 'success' : 'danger'}>{r.estado}</Badge>
    )},
    { header: 'Padre / Madre', sortValue: (r) => r.padre?.nombre_completo || '', render: (r) => r.padre ? (
      <div>
        <p className="text-sm font-medium text-primary-800">{r.padre.nombre_completo}</p>
        <p className="text-xs text-gold-600">DNI: {r.padre.dni} | Tel: {r.padre.celular}</p>
      </div>
    ) : (
      <span className="text-xs text-cream-400 italic">Sin vincular</span>
    )},
    { header: 'Acciones', render: (r) => (
      <button onClick={() => navigate(`/alumno/${r.id}`)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gold-700 bg-gold-50 rounded-lg hover:bg-gold-100 border border-gold-200 transition-colors">
        <HiEye className="w-3.5 h-3.5" /> Ver
      </button>
    )},
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/config-escolar')} className="p-2 text-primary-800/70 hover:bg-cream-100 rounded-lg transition-colors">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-primary-800 font-display">
            {aula.grado?.nombre} "{aula.seccion}"
          </h1>
          <p className="text-sm text-gold-600">{aula.grado?.nivel?.nombre} - Vista del Aula</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 shadow-md">
              <HiAcademicCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gold-600 font-medium">Nivel / Grado</p>
              <p className="text-sm font-semibold text-primary-800">{aula.grado?.nivel?.nombre}</p>
              <p className="text-sm text-primary-800/70">{aula.grado?.nombre} - Seccion {aula.seccion}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500 shadow-md">
              <HiUser className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gold-600 font-medium">Tutor</p>
              <p className="text-sm font-semibold text-primary-800">
                {aula.tutor?.nombres || 'Sin asignar'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 shadow-md">
              <HiUserGroup className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gold-600 font-medium">Total Alumnos</p>
              <p className="text-2xl font-bold text-primary-800 font-display">{aula.total_alumnos}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title={`Alumnos del Aula (${aula.total_alumnos})`}>
        <DataTable
          columns={alumnosColumns}
          data={aula.alumnos}
          loading={false}
          emptyMessage="No hay alumnos registrados en esta aula"
        />
      </Card>
    </div>
  );
};

export default AulaDetalle;

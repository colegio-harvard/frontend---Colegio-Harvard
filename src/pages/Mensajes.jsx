import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES, fileUrl } from '../utils/constants';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { listarAulas, listarNiveles } from '../services/configEscolarService';
import { obtenerHijosPadre } from '../services/asistenciaService';
import { HiAcademicCap, HiUserGroup, HiUser, HiFilter, HiChevronRight, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Mensajes = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aulas, setAulas] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [hijos, setHijos] = useState([]);

  const isPadre = usuario?.rol_codigo === ROLES.PADRE;
  const isTutor = usuario?.rol_codigo === ROLES.TUTOR;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isPadre) {
          const { data } = await obtenerHijosPadre();
          setHijos(data.data || []);
        } else {
          const [aulasR, nivelesR] = await Promise.all([listarAulas(), listarNiveles()]);
          let aulasData = aulasR.data.data || [];
          if (isTutor) {
            aulasData = aulasData.filter(a =>
              a.asignacion_tutor?.some(at => at.id_usuario_tutor === usuario.id)
            );
          }
          setAulas(aulasData);
          setNiveles(nivelesR.data.data || []);
        }
      } catch {
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isPadre, isTutor]);

  const gradosDelNivel = useMemo(() => {
    if (!filtroNivel) return [];
    const nivel = niveles.find(n => n.id === parseInt(filtroNivel));
    return nivel?.grados || [];
  }, [filtroNivel, niveles]);

  const seccionesDelGrado = useMemo(() => {
    if (!filtroGrado) return [];
    return [...new Set(aulas.filter(a => a.id_grado === parseInt(filtroGrado)).map(a => a.seccion))].sort();
  }, [filtroGrado, aulas]);

  const aulasFiltradas = useMemo(() => {
    let resultado = aulas;
    if (filtroNivel) {
      const gradosIds = gradosDelNivel.map(g => g.id);
      resultado = resultado.filter(a => gradosIds.includes(a.id_grado));
    }
    if (filtroGrado) resultado = resultado.filter(a => a.id_grado === parseInt(filtroGrado));
    if (filtroSeccion) resultado = resultado.filter(a => a.seccion === filtroSeccion);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter(a => {
        const nombre = `${a.grado?.nombre || ''} ${a.seccion}`.toLowerCase();
        const tutor = a.asignacion_tutor?.[0]?.tutor?.nombres?.toLowerCase() || '';
        return nombre.includes(q) || tutor.includes(q);
      });
    }
    return resultado;
  }, [aulas, filtroNivel, filtroGrado, filtroSeccion, busqueda, gradosDelNivel]);

  const handleResetFiltros = () => { setFiltroNivel(''); setFiltroGrado(''); setFiltroSeccion(''); setBusqueda(''); };

  if (loading) return <LoadingSpinner />;

  // --- Vista PADRE ---
  if (isPadre) {
    return (
      <div className="animate-fade-in">
        <h1 className="page-title mb-6">Chats</h1>
        {hijos.length === 0 ? (
          <Card><p className="text-center text-gold-600 py-8">No se encontraron hijos vinculados</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hijos.map(hijo => (
              <button key={hijo.id} onClick={() => navigate(`/mensajes/alumno/${hijo.id}`)} className="text-left group">
                <Card className="hover:shadow-lg hover:border-gold-300 transition-all duration-200 h-full">
                  <div className="flex items-center gap-3">
                    {hijo.foto_url ? (
                      <img src={fileUrl(hijo.foto_url)} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gold-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
                        <span className="text-white text-lg font-bold">{hijo.nombre_completo?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-800 truncate">{hijo.nombre_completo}</p>
                      <p className="text-xs text-gold-600">{hijo.aula?.grado?.nombre} "{hijo.aula?.seccion}"</p>
                      <p className="text-xs text-cream-400">{hijo.aula?.grado?.nivel}</p>
                    </div>
                    <HiChevronRight className="w-5 h-5 text-cream-300 group-hover:text-gold-500 transition-colors" />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Vista ADMIN / TUTOR ---
  return (
    <div className="animate-fade-in">
      <h1 className="page-title mb-6">Chats</h1>

      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <HiFilter className="w-4 h-4 text-gold-600" />
          <span className="text-sm font-medium text-primary-800">Filtros</span>
          {(filtroNivel || filtroGrado || filtroSeccion || busqueda) && (
            <button onClick={handleResetFiltros} className="ml-auto text-xs text-gold-600 hover:text-gold-800 underline">Limpiar</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-primary-800/60 mb-1">Nivel Educativo</label>
            <select value={filtroNivel} onChange={(e) => { setFiltroNivel(e.target.value); setFiltroGrado(''); setFiltroSeccion(''); }}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white">
              <option value="">Todos</option>
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-800/60 mb-1">Grado</label>
            <select value={filtroGrado} onChange={(e) => { setFiltroGrado(e.target.value); setFiltroSeccion(''); }} disabled={!filtroNivel}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white disabled:opacity-50">
              <option value="">Todos</option>
              {gradosDelNivel.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-800/60 mb-1">Sección</label>
            <select value={filtroSeccion} onChange={(e) => setFiltroSeccion(e.target.value)} disabled={!filtroGrado}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white disabled:opacity-50">
              <option value="">Todas</option>
              {seccionesDelGrado.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-800/60 mb-1">Buscar</label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
              <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Grado, sección o tutor..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-cream-300 rounded-lg outline-none" />
            </div>
          </div>
        </div>
      </Card>

      {aulasFiltradas.length === 0 ? (
        <Card><p className="text-center text-gold-600 py-8">No se encontraron aulas</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {aulasFiltradas.map(aula => {
            const tutorNombre = aula.asignacion_tutor?.[0]?.tutor?.nombres || 'Sin tutor';
            const nivelNombre = aula.grado?.nivel?.nombre || '';
            const totalAlumnos = aula.total_alumnos ?? '—';
            return (
              <button key={aula.id} onClick={() => navigate(`/mensajes/aula/${aula.id}`)} className="text-left group">
                <Card className="hover:shadow-lg hover:border-gold-300 transition-all duration-200 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 shadow-md">
                        <HiAcademicCap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary-800">{aula.grado?.nombre} "{aula.seccion}"</p>
                        <p className="text-xs text-gold-600">{nivelNombre}</p>
                      </div>
                    </div>
                    <HiChevronRight className="w-5 h-5 text-cream-300 group-hover:text-gold-500 transition-colors mt-1" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-primary-800/60">
                    <div className="flex items-center gap-1.5"><HiUser className="w-3.5 h-3.5" /><span>{tutorNombre}</span></div>
                    <div className="flex items-center gap-1.5"><HiUserGroup className="w-3.5 h-3.5" /><span>{totalAlumnos} alumnos</span></div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Mensajes;

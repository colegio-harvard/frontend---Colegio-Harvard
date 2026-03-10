import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { listarAulas, listarNiveles, obtenerAula } from '../services/configEscolarService';
import { obtenerHijosPadre } from '../services/asistenciaService';
import { publicarAgendaMasivo } from '../services/agendaService';
import { todayLimaISO } from '../utils/formatters';
import { HiAcademicCap, HiUserGroup, HiUser, HiFilter, HiChevronRight, HiSearch, HiPlus } from 'react-icons/hi';
import toast from 'react-hot-toast';

const SELECCION_TIPOS = [
  { value: 'TODAS', label: 'Todas mis aulas' },
  { value: 'AULAS', label: 'Seleccionar aulas' },
  { value: 'ALUMNOS', label: 'Seleccionar alumnos' },
];

const Agenda = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Admin/Tutor state
  const [aulas, setAulas] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Padre state
  const [hijos, setHijos] = useState([]);

  // Publicar masivo state
  const [modalMasivo, setModalMasivo] = useState(false);
  const [formMasivo, setFormMasivo] = useState({
    contenido: '', fecha: todayLimaISO(), seleccion: 'TODAS', idsAulas: [], idsAlumnos: [],
  });
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [publicando, setPublicando] = useState(false);

  const isPadre = usuario?.rol_codigo === ROLES.PADRE;
  const isTutor = usuario?.rol_codigo === ROLES.TUTOR;
  const canPublish = [ROLES.TUTOR, ROLES.SUPER_ADMIN].includes(usuario?.rol_codigo);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isPadre) {
          const { data } = await obtenerHijosPadre();
          setHijos(data.data || []);
        } else {
          const [aulasR, nivelesR] = await Promise.all([
            listarAulas(),
            listarNiveles(),
          ]);
          let aulasData = aulasR.data.data || [];
          // Tutor: mostrar solo las aulas asignadas
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

  // Grados del nivel seleccionado
  const gradosDelNivel = useMemo(() => {
    if (!filtroNivel) return [];
    const nivel = niveles.find(n => n.id === parseInt(filtroNivel));
    return nivel?.grados || [];
  }, [filtroNivel, niveles]);

  // Secciones únicas del grado seleccionado
  const seccionesDelGrado = useMemo(() => {
    if (!filtroGrado) return [];
    return [...new Set(
      aulas
        .filter(a => a.id_grado === parseInt(filtroGrado))
        .map(a => a.seccion)
    )].sort();
  }, [filtroGrado, aulas]);

  // Aulas filtradas
  const aulasFiltradas = useMemo(() => {
    let resultado = aulas;
    if (filtroNivel) {
      const gradosIds = gradosDelNivel.map(g => g.id);
      resultado = resultado.filter(a => gradosIds.includes(a.id_grado));
    }
    if (filtroGrado) {
      resultado = resultado.filter(a => a.id_grado === parseInt(filtroGrado));
    }
    if (filtroSeccion) {
      resultado = resultado.filter(a => a.seccion === filtroSeccion);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter(a => {
        const nombre = `${a.grado?.nombre || ''} ${a.seccion}`.toLowerCase();
        const tutor = a.tutor?.nombres?.toLowerCase() || a.asignacion_tutor?.[0]?.tutor?.nombres?.toLowerCase() || '';
        return nombre.includes(q) || tutor.includes(q);
      });
    }
    return resultado;
  }, [aulas, filtroNivel, filtroGrado, filtroSeccion, busqueda, gradosDelNivel]);

  const handleResetFiltros = () => {
    setFiltroNivel('');
    setFiltroGrado('');
    setFiltroSeccion('');
    setBusqueda('');
  };

  // --- Publicar masivo ---
  const fetchAlumnosDeAulas = async (aulasIds) => {
    setLoadingAlumnos(true);
    try {
      const results = await Promise.all(aulasIds.map(id => obtenerAula(id)));
      const todos = results.flatMap(r => {
        const aula = r.data.data;
        return (aula.alumnos || [])
          .filter(a => a.estado === 'ACTIVO')
          .map(a => ({ ...a, aula_seccion: aula.seccion, grado_nombre: aula.grado?.nombre }));
      });
      setAlumnosDisponibles(todos);
    } catch {
      toast.error('Error al cargar alumnos');
    } finally {
      setLoadingAlumnos(false);
    }
  };

  const handleSeleccionChange = (valor) => {
    setFormMasivo(prev => ({
      ...prev,
      seleccion: valor,
      idsAulas: valor === 'TODAS' ? aulas.map(a => a.id) : [],
      idsAlumnos: [],
    }));
    if (valor === 'ALUMNOS') {
      fetchAlumnosDeAulas(aulas.map(a => a.id));
    }
  };

  const handlePublicarMasivo = async (e) => {
    e.preventDefault();
    setPublicando(true);
    try {
      const payload = {
        contenido_texto: formMasivo.contenido,
        fecha: formMasivo.fecha,
      };

      if (formMasivo.seleccion === 'TODAS') {
        payload.alcance = 'AULA';
        payload.ids_aulas = aulas.map(a => a.id);
      } else if (formMasivo.seleccion === 'AULAS') {
        payload.alcance = 'AULA';
        payload.ids_aulas = formMasivo.idsAulas;
      } else if (formMasivo.seleccion === 'ALUMNOS') {
        payload.alcance = 'ALUMNO';
        payload.ids_alumnos = formMasivo.idsAlumnos;
      }

      const { data } = await publicarAgendaMasivo(payload);
      toast.success(data.mensaje || 'Agenda publicada');
      setModalMasivo(false);
      setFormMasivo({ contenido: '', fecha: todayLimaISO(), seleccion: 'TODAS', idsAulas: [], idsAlumnos: [] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al publicar');
    } finally {
      setPublicando(false);
    }
  };

  const resumenSeleccion = useMemo(() => {
    if (formMasivo.seleccion === 'TODAS') return `Se publicará en ${aulas.length} aula(s)`;
    if (formMasivo.seleccion === 'AULAS') return `${formMasivo.idsAulas.length} aula(s) seleccionada(s)`;
    if (formMasivo.seleccion === 'ALUMNOS') return `${formMasivo.idsAlumnos.length} alumno(s) seleccionado(s)`;
    return '';
  }, [formMasivo.seleccion, formMasivo.idsAulas.length, formMasivo.idsAlumnos.length, aulas.length]);

  const submitDisabled = publicando
    || (formMasivo.seleccion === 'AULAS' && formMasivo.idsAulas.length === 0)
    || (formMasivo.seleccion === 'ALUMNOS' && formMasivo.idsAlumnos.length === 0);

  if (loading) return <LoadingSpinner />;

  // --- Vista PADRE: mostrar hijos directamente ---
  if (isPadre) {
    return (
      <div className="animate-fade-in">
        <h1 className="page-title mb-6">Agenda del Cuaderno</h1>
        {hijos.length === 0 ? (
          <Card><p className="text-center text-gold-600 py-8">No se encontraron hijos vinculados</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hijos.map(hijo => (
              <button
                key={hijo.id}
                onClick={() => navigate(`/agenda/alumno/${hijo.id}`)}
                className="text-left group"
              >
                <Card className="hover:shadow-lg hover:border-gold-300 transition-all duration-200 h-full">
                  <div className="flex items-center gap-3">
                    {hijo.foto_url ? (
                      <img src={hijo.foto_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gold-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
                        <span className="text-white text-lg font-bold">{hijo.nombre_completo?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-800 truncate">{hijo.nombre_completo}</p>
                      <p className="text-xs text-gold-600">
                        {hijo.aula?.grado?.nombre} "{hijo.aula?.seccion}"
                      </p>
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

  // --- Vista ADMIN / TUTOR: listado de aulas con filtros ---
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Agenda del Cuaderno</h1>
        {canPublish && (
          <button
            onClick={() => setModalMasivo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium"
          >
            <HiPlus className="w-4 h-4" /> Publicar
          </button>
        )}
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <HiFilter className="w-4 h-4 text-gold-600" />
          <span className="text-sm font-medium text-primary-800">Filtros</span>
          {(filtroNivel || filtroGrado || filtroSeccion || busqueda) && (
            <button onClick={handleResetFiltros} className="ml-auto text-xs text-gold-600 hover:text-gold-800 underline">
              Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-primary-800/60 mb-1">Nivel Educativo</label>
            <select
              value={filtroNivel}
              onChange={(e) => { setFiltroNivel(e.target.value); setFiltroGrado(''); setFiltroSeccion(''); }}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white"
            >
              <option value="">Todos</option>
              {niveles.map(n => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-800/60 mb-1">Grado</label>
            <select
              value={filtroGrado}
              onChange={(e) => { setFiltroGrado(e.target.value); setFiltroSeccion(''); }}
              disabled={!filtroNivel}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white disabled:opacity-50"
            >
              <option value="">Todos</option>
              {gradosDelNivel.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-800/60 mb-1">Sección</label>
            <select
              value={filtroSeccion}
              onChange={(e) => setFiltroSeccion(e.target.value)}
              disabled={!filtroGrado}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white disabled:opacity-50"
            >
              <option value="">Todas</option>
              {seccionesDelGrado.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-800/60 mb-1">Buscar</label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Grado, sección o tutor..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-cream-300 rounded-lg outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de aulas */}
      {aulasFiltradas.length === 0 ? (
        <Card><p className="text-center text-gold-600 py-8">No se encontraron aulas</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {aulasFiltradas.map(aula => {
            const tutorNombre = aula.tutor?.nombres || aula.asignacion_tutor?.[0]?.tutor?.nombres || 'Sin tutor';
            const nivelNombre = aula.grado?.nivel?.nombre || '';
            const totalAlumnos = aula.total_alumnos ?? aula._count?.tbl_alumnos ?? '—';

            return (
              <button
                key={aula.id}
                onClick={() => navigate(`/agenda/aula/${aula.id}`)}
                className="text-left group"
              >
                <Card className="hover:shadow-lg hover:border-gold-300 transition-all duration-200 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 shadow-md">
                        <HiAcademicCap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary-800">
                          {aula.grado?.nombre} "{aula.seccion}"
                        </p>
                        <p className="text-xs text-gold-600">{nivelNombre}</p>
                      </div>
                    </div>
                    <HiChevronRight className="w-5 h-5 text-cream-300 group-hover:text-gold-500 transition-colors mt-1" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-primary-800/60">
                    <div className="flex items-center gap-1.5">
                      <HiUser className="w-3.5 h-3.5" />
                      <span>{tutorNombre}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HiUserGroup className="w-3.5 h-3.5" />
                      <span>{totalAlumnos} alumnos</span>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal Publicar Masivo */}
      <Modal isOpen={modalMasivo} onClose={() => setModalMasivo(false)} title="Publicar en Agenda" size="lg">
        <form onSubmit={handlePublicarMasivo} className="space-y-4">
          {/* Selector de destinatarios */}
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-2">Destinatarios</label>
            <div className="flex flex-wrap gap-2">
              {SELECCION_TIPOS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSeleccionChange(opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    formMasivo.seleccion === opt.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-primary-800 border-cream-300 hover:border-gold-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Checkboxes de aulas */}
          {formMasivo.seleccion === 'AULAS' && (
            <div className="max-h-40 overflow-y-auto border border-cream-200 rounded-lg p-3 space-y-1">
              {aulas.map(aula => (
                <label key={aula.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-cream-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={formMasivo.idsAulas.includes(aula.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormMasivo(prev => ({
                        ...prev,
                        idsAulas: checked
                          ? [...prev.idsAulas, aula.id]
                          : prev.idsAulas.filter(id => id !== aula.id),
                      }));
                    }}
                    className="rounded border-cream-300"
                  />
                  <span>{aula.grado?.nombre} "{aula.seccion}"</span>
                  <span className="text-xs text-cream-400 ml-auto">{aula.grado?.nivel?.nombre}</span>
                </label>
              ))}
            </div>
          )}

          {/* Checkboxes de alumnos */}
          {formMasivo.seleccion === 'ALUMNOS' && (
            <div className="max-h-60 overflow-y-auto border border-cream-200 rounded-lg p-3 space-y-1">
              {loadingAlumnos ? (
                <p className="text-sm text-gold-600 text-center py-4">Cargando alumnos...</p>
              ) : alumnosDisponibles.length === 0 ? (
                <p className="text-sm text-gold-600 text-center py-4">No hay alumnos disponibles</p>
              ) : (
                alumnosDisponibles.map(al => (
                  <label key={al.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-cream-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={formMasivo.idsAlumnos.includes(al.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormMasivo(prev => ({
                          ...prev,
                          idsAlumnos: checked
                            ? [...prev.idsAlumnos, al.id]
                            : prev.idsAlumnos.filter(id => id !== al.id),
                        }));
                      }}
                      className="rounded border-cream-300"
                    />
                    <span>{al.nombre_completo}</span>
                    <span className="text-xs text-cream-400 ml-auto">{al.grado_nombre} "{al.aula_seccion}"</span>
                  </label>
                ))
              )}
            </div>
          )}

          {/* Resumen */}
          <div className="bg-cream-50 p-3 rounded-lg">
            <p className="text-xs text-gold-600">{resumenSeleccion}</p>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Fecha</label>
            <input
              type="date"
              value={formMasivo.fecha}
              onChange={(e) => setFormMasivo(prev => ({ ...prev, fecha: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none"
            />
          </div>

          {/* Contenido */}
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Contenido</label>
            <textarea
              value={formMasivo.contenido}
              onChange={(e) => setFormMasivo(prev => ({ ...prev, contenido: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none"
              rows={5}
              placeholder="Escriba el contenido de la agenda..."
            />
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalMasivo(false)}
              className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {publicando ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Agenda;

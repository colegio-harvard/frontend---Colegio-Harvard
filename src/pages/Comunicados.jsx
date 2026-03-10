import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { listarAulas, listarNiveles, listarGrados } from '../services/configEscolarService';
import { crearComunicado } from '../services/comunicadosService';
import { listarAlumnos } from '../services/alumnosService';
import { obtenerHijosPadre } from '../services/asistenciaService';
import { HiAcademicCap, HiUserGroup, HiUser, HiFilter, HiChevronRight, HiSearch, HiPlus, HiX, HiCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Comunicados = () => {
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
  const canCreate = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PSICOLOGIA].includes(usuario?.rol_codigo);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', cuerpo: '', prioridad: 'NORMAL', tipo_audiencia: 'COLEGIO', id_ref_audiencia: '', ids_alumnos: [] });
  const [gradosLista, setGradosLista] = useState([]);
  const [aulasModal, setAulasModal] = useState([]);
  const [alumnosLista, setAlumnosLista] = useState([]);
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [dropdownAlumnosOpen, setDropdownAlumnosOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownAlumnosOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isPadre) {
          const { data } = await obtenerHijosPadre();
          setHijos(data.data || []);
        } else {
          const [aulasR, nivelesR] = await Promise.all([listarAulas(), listarNiveles()]);
          const aulasData = aulasR.data.data || [];
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
  }, [isPadre]);

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

  const handleOpenCreate = async () => {
    try {
      const [gradosR, aulasR, alumnosR] = await Promise.all([listarGrados(), listarAulas(), listarAlumnos({ estado: 'ACTIVO' })]);
      setGradosLista(gradosR.data.data || []);
      setAulasModal(aulasR.data.data || []);
      setAlumnosLista(alumnosR.data.data || []);
    } catch { /* silenciar */ }
    setForm({ titulo: '', cuerpo: '', prioridad: 'NORMAL', tipo_audiencia: 'COLEGIO', id_ref_audiencia: '', ids_alumnos: [] });
    setBusquedaAlumno('');
    setDropdownAlumnosOpen(false);
    setModalOpen(true);
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (payload.tipo_audiencia === 'ALUMNO') {
        delete payload.id_ref_audiencia;
      } else {
        delete payload.ids_alumnos;
        if (payload.id_ref_audiencia) payload.id_ref_audiencia = parseInt(payload.id_ref_audiencia);
        else delete payload.id_ref_audiencia;
      }
      await crearComunicado(payload);
      toast.success('Comunicado publicado');
      setModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear comunicado');
    }
  };

  if (loading) return <LoadingSpinner />;

  // --- Vista PADRE ---
  if (isPadre) {
    return (
      <div className="animate-fade-in">
        <h1 className="page-title mb-6">Comunicados</h1>
        {hijos.length === 0 ? (
          <Card><p className="text-center text-gold-600 py-8">No se encontraron hijos vinculados</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hijos.map(hijo => (
              <button key={hijo.id} onClick={() => navigate(`/comunicados/alumno/${hijo.id}`)} className="text-left group">
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

  // --- Vista ADMIN ---
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Comunicados</h1>
        {canCreate && (
          <button onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
            <HiPlus className="w-4 h-4" /> Nuevo Comunicado
          </button>
        )}
      </div>

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
            const totalAlumnos = aula.total_alumnos ?? '--';
            return (
              <button key={aula.id} onClick={() => navigate(`/comunicados/aula/${aula.id}`)} className="text-left group">
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

      {/* Modal Nuevo Comunicado */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Comunicado" size="lg">
        <form onSubmit={handleCrear} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Titulo</label>
            <input type="text" value={form.titulo} onChange={(e) => setForm({...form, titulo: e.target.value})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Contenido</label>
            <textarea value={form.cuerpo} onChange={(e) => setForm({...form, cuerpo: e.target.value})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" rows={5} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={(e) => setForm({...form, prioridad: e.target.value})}
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Audiencia</label>
              <select value={form.tipo_audiencia} onChange={(e) => setForm({...form, tipo_audiencia: e.target.value, id_ref_audiencia: '', ids_alumnos: []})}
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
                <option value="COLEGIO">Todo el Colegio</option>
                <option value="NIVEL">Por Nivel</option>
                <option value="GRADO">Por Grado</option>
                <option value="AULA">Por Aula</option>
                <option value="ALUMNO">Por Alumno</option>
              </select>
            </div>
          </div>
          {form.tipo_audiencia === 'NIVEL' && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Nivel</label>
              <select value={form.id_ref_audiencia} onChange={(e) => setForm({...form, id_ref_audiencia: e.target.value})} required
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
                <option value="">Seleccione...</option>
                {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </div>
          )}
          {form.tipo_audiencia === 'GRADO' && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Grado</label>
              <select value={form.id_ref_audiencia} onChange={(e) => setForm({...form, id_ref_audiencia: e.target.value})} required
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
                <option value="">Seleccione...</option>
                {gradosLista.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
          )}
          {form.tipo_audiencia === 'AULA' && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Aula</label>
              <select value={form.id_ref_audiencia} onChange={(e) => setForm({...form, id_ref_audiencia: e.target.value})} required
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
                <option value="">Seleccione...</option>
                {aulasModal.map(a => <option key={a.id} value={a.id}>{a.grado?.nombre} "{a.seccion}"</option>)}
              </select>
            </div>
          )}
          {form.tipo_audiencia === 'ALUMNO' && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Alumnos</label>
              {form.ids_alumnos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.ids_alumnos.map(aid => {
                    const al = alumnosLista.find(a => a.id === aid);
                    return al ? (
                      <span key={aid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs">
                        {al.nombre_completo}
                        <button type="button" onClick={() => setForm({...form, ids_alumnos: form.ids_alumnos.filter(i => i !== aid)})}
                          className="hover:text-red-600"><HiX className="w-3 h-3" /></button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center border border-cream-300 rounded-lg overflow-hidden">
                  <HiSearch className="w-4 h-4 text-gold-500 ml-3" />
                  <input type="text" value={busquedaAlumno}
                    onChange={(e) => { setBusquedaAlumno(e.target.value); setDropdownAlumnosOpen(true); }}
                    onFocus={() => setDropdownAlumnosOpen(true)}
                    placeholder="Buscar alumno..."
                    className="w-full px-2 py-2 outline-none text-sm" />
                </div>
                {dropdownAlumnosOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-cream-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {alumnosLista
                      .filter(a => a.nombre_completo.toLowerCase().includes(busquedaAlumno.toLowerCase()))
                      .map(a => {
                        const selected = form.ids_alumnos.includes(a.id);
                        return (
                          <button type="button" key={a.id}
                            onClick={() => {
                              setForm(prev => ({
                                ...prev,
                                ids_alumnos: selected
                                  ? prev.ids_alumnos.filter(i => i !== a.id)
                                  : [...prev.ids_alumnos, a.id],
                              }));
                            }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-cream-50 ${selected ? 'bg-primary-50' : ''}`}>
                            <span>
                              {a.nombre_completo}
                              <span className="text-xs text-gold-500 ml-2">{a.aula?.grado?.nombre} {a.aula?.seccion}</span>
                            </span>
                            {selected && <HiCheck className="w-4 h-4 text-primary-600" />}
                          </button>
                        );
                      })}
                    {alumnosLista.filter(a => a.nombre_completo.toLowerCase().includes(busquedaAlumno.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-gold-500">Sin resultados</p>
                    )}
                  </div>
                )}
              </div>
              {form.ids_alumnos.length === 0 && <input type="text" required value="" className="sr-only" tabIndex={-1} onChange={() => {}} />}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Publicar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Comunicados;

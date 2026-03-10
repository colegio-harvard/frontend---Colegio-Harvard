import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { obtenerAlumno } from '../services/alumnosService';
import { listarComunicadosPorAlumno, crearComunicado, marcarLeido } from '../services/comunicadosService';
import { listarNiveles, listarGrados, listarAulas } from '../services/configEscolarService';
import { listarAlumnos } from '../services/alumnosService';
import { formatFechaHora } from '../utils/formatters';
import { HiArrowLeft, HiPlus, HiSpeakerphone, HiCheck, HiX, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';

const ComunicadosAlumno = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [alumno, setAlumno] = useState(null);
  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', cuerpo: '', prioridad: 'NORMAL', tipo_audiencia: 'ALUMNO', id_ref_audiencia: '', ids_alumnos: [] });
  const [niveles, setNiveles] = useState([]);
  const [grados, setGrados] = useState([]);
  const [aulasLista, setAulasLista] = useState([]);
  const [alumnosLista, setAlumnosLista] = useState([]);
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [dropdownAlumnosOpen, setDropdownAlumnosOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isPadre = usuario?.rol_codigo === ROLES.PADRE;
  const canCreate = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PSICOLOGIA].includes(usuario?.rol_codigo);

  const fetchComunicados = async () => {
    try {
      const { data } = await listarComunicadosPorAlumno(id);
      setComunicados(data.data || []);
    } catch {
      toast.error('Error al cargar comunicados');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await obtenerAlumno(id);
        setAlumno(data.data);
        await fetchComunicados();
      } catch {
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownAlumnosOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useSocket('comunicado:nuevo', () => fetchComunicados());

  const handleOpenCreate = async () => {
    try {
      const [nivelesR, gradosR, aulasR, alumnosR] = await Promise.all([listarNiveles(), listarGrados(), listarAulas(), listarAlumnos({ estado: 'ACTIVO' })]);
      setNiveles(nivelesR.data.data || []);
      setGrados(gradosR.data.data || []);
      const aulas = aulasR.data.data || [];
      const alumnos = alumnosR.data.data || [];
      setAulasLista(aulas);
      setAlumnosLista(alumnos);
    } catch { /* silenciar */ }
    setForm({
      titulo: '', cuerpo: '', prioridad: 'NORMAL',
      tipo_audiencia: 'ALUMNO',
      id_ref_audiencia: '',
      ids_alumnos: [parseInt(id)],
    });
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
      fetchComunicados();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleVerComunicado = async (com) => {
    if (isPadre && !com.leido) {
      try {
        await marcarLeido(com.id);
        setComunicados(prev => prev.map(c => c.id === com.id ? { ...c, leido: true } : c));
      } catch { /* silenciar */ }
    }
  };

  const goBack = () => {
    if (isPadre) {
      navigate('/comunicados');
    } else if (alumno?.id_aula || alumno?.tbl_aulas?.id) {
      navigate(`/comunicados/aula/${alumno.id_aula || alumno.tbl_aulas?.id}`);
    } else {
      navigate('/comunicados');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!alumno) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => navigate('/comunicados')} className="flex items-center gap-2 mb-4 text-primary-800/70 hover:text-primary-800">
          <HiArrowLeft className="w-5 h-5" /> Volver
        </button>
        <Card><p className="text-center text-gold-600 py-8">No se pudo cargar el alumno</p></Card>
      </div>
    );
  }

  const aulaInfo = alumno.tbl_aulas || alumno.aula;
  const gradoNombre = aulaInfo?.tbl_grados?.nombre || aulaInfo?.grado?.nombre || '';
  const nivelNombre = aulaInfo?.tbl_grados?.tbl_niveles?.nombre || aulaInfo?.grado?.nivel || '';
  const seccion = aulaInfo?.seccion || '';

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 text-primary-800/70 hover:bg-cream-100 rounded-lg transition-colors">
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            {alumno.foto_url ? (
              <img src={alumno.foto_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-gold-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
                <span className="text-white text-lg font-bold">{alumno.nombre_completo?.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-primary-800 font-display">{alumno.nombre_completo}</h1>
              <p className="text-xs text-gold-600">{gradoNombre} "{seccion}" — {nivelNombre}</p>
            </div>
          </div>
        </div>
        {canCreate && (
          <button onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
            <HiPlus className="w-4 h-4" /> Nuevo Comunicado
          </button>
        )}
      </div>

      {comunicados.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <HiSpeakerphone className="w-12 h-12 text-cream-300 mx-auto mb-3" />
            <p className="text-gold-600">No hay comunicados para este alumno</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {comunicados.map(com => (
            <Card key={com.id} onClick={() => handleVerComunicado(com)} className="cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-primary-800">{com.titulo}</h3>
                    {com.prioridad === 'ALTA' && <Badge variant="danger">ALTA</Badge>}
                    {isPadre && !com.leido && <span className="w-2 h-2 bg-gold-500 rounded-full"></span>}
                  </div>
                  <p className="text-xs text-gold-600">
                    {formatFechaHora(com.publicado_en || com.date_time_registration)} - {com.creador} - Audiencia: {com.audiencia}
                  </p>
                </div>
                {com.leido && <Badge variant="success">Leido</Badge>}
                {!isPadre && <span className="text-xs text-cream-400">{com.total_lecturas} lecturas</span>}
              </div>
              <p className="text-sm text-primary-800/80 whitespace-pre-wrap">{com.contenido}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Nuevo Comunicado */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Comunicado" size="lg">
        <form onSubmit={handleCrear} className="space-y-4">
          <div className="bg-cream-50 p-3 rounded-lg">
            <p className="text-xs text-gold-600">Comunicado sobre:</p>
            <p className="text-sm font-medium text-primary-800">{alumno.nombre_completo}</p>
            <p className="text-xs text-cream-400">{gradoNombre} "{seccion}"</p>
          </div>
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
              <select value={form.tipo_audiencia} onChange={(e) => setForm({...form, tipo_audiencia: e.target.value, id_ref_audiencia: '', ids_alumnos: e.target.value === 'ALUMNO' ? [parseInt(id)] : []})}
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
                {grados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
          )}
          {form.tipo_audiencia === 'AULA' && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Aula</label>
              <select value={form.id_ref_audiencia} onChange={(e) => setForm({...form, id_ref_audiencia: e.target.value})} required
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
                <option value="">Seleccione...</option>
                {aulasLista.map(a => <option key={a.id} value={a.id}>{a.grado?.nombre} {a.seccion}</option>)}
              </select>
            </div>
          )}
          {form.tipo_audiencia === 'ALUMNO' && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Alumnos</label>
              {form.ids_alumnos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.ids_alumnos.map(aid => {
                    const al = alumnosLista.find(a => a.id === aid) || (aid === parseInt(id) ? alumno : null);
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

export default ComunicadosAlumno;

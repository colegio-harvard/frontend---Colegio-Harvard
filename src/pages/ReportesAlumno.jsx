import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { obtenerAlumno } from '../services/alumnosService';
import { listarReportes, crearReporte, firmarReporte } from '../services/reportesService';
import { formatFecha } from '../utils/formatters';
import { HiArrowLeft, HiPlus, HiCheck, HiDocumentText } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';

const ReportesAlumno = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [alumno, setAlumno] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ semana_inicio: '', semana_fin: '', logros: '', resumen: '', pendientes: '', observaciones: '' });

  const canCreate = [ROLES.TUTOR, ROLES.SUPER_ADMIN].includes(usuario?.rol_codigo);
  const isPadre = usuario?.rol_codigo === ROLES.PADRE;

  useSocket('reporte:nuevo', () => fetchReportes());
  useSocket('reporte:firmado', () => fetchReportes());

  const fetchReportes = async () => {
    try {
      const { data } = await listarReportes({ id_alumno: id });
      setReportes(data.data || []);
    } catch {
      toast.error('Error al cargar reportes');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await obtenerAlumno(id);
        setAlumno(data.data);
        await fetchReportes();
      } catch {
        toast.error('Error al cargar datos del alumno');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await crearReporte({
        semana_inicio: form.semana_inicio,
        semana_fin: form.semana_fin,
        contenido: { logros: form.logros, resumen: form.resumen, pendientes: form.pendientes, observaciones: form.observaciones },
        id_alumno: parseInt(id),
        id_aula: alumno?.id_aula || alumno?.tbl_aulas?.id,
        alcance: 'ALUMNO',
      });
      toast.success('Reporte creado');
      setModalOpen(false);
      setForm({ semana_inicio: '', semana_fin: '', logros: '', resumen: '', pendientes: '', observaciones: '' });
      fetchReportes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear reporte');
    }
  };

  const handleFirmar = async (id_reporte) => {
    try {
      await firmarReporte({ id_reporte_semanal: id_reporte });
      toast.success('Reporte firmado');
      fetchReportes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al firmar');
    }
  };

  const goBack = () => {
    if (isPadre) {
      navigate('/reportes-semanales');
    } else if (alumno?.id_aula || alumno?.tbl_aulas?.id) {
      navigate(`/reportes-semanales/aula/${alumno.id_aula || alumno.tbl_aulas?.id}`);
    } else {
      navigate('/reportes-semanales');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!alumno) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => navigate('/reportes-semanales')} className="flex items-center gap-2 mb-4 text-primary-800/70 hover:text-primary-800">
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
      {/* Header */}
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
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
            <HiPlus className="w-4 h-4" /> Nuevo Reporte
          </button>
        )}
      </div>

      {/* Reportes */}
      {reportes.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <HiDocumentText className="w-12 h-12 text-cream-300 mx-auto mb-3" />
            <p className="text-gold-600">No hay reportes semanales para este alumno</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {reportes.map(reporte => (
            <Card key={reporte.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-primary-800">
                      Semana: {formatFecha(reporte.semana_inicio)} - {formatFecha(reporte.semana_fin)}
                    </h3>
                    <Badge variant={reporte.alcance === 'AULA' ? 'info' : 'default'}>
                      {reporte.alcance === 'AULA' ? 'Aula' : 'Individual'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gold-600">Tutor: {reporte.tutor?.nombres}</p>
                </div>
                {isPadre && !reporte.firmada && (
                  <button onClick={() => handleFirmar(reporte.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    <HiCheck className="w-3 h-3" /> Firmar
                  </button>
                )}
                {reporte.firmada && <Badge variant="success">Firmado</Badge>}
              </div>
              {typeof reporte.contenido === 'object' && reporte.contenido !== null ? (
                <div className="space-y-2 text-sm text-primary-800/80">
                  {reporte.contenido.logros && <div><span className="font-medium text-primary-800">Logros:</span> <span className="whitespace-pre-wrap">{reporte.contenido.logros}</span></div>}
                  {reporte.contenido.resumen && <div><span className="font-medium text-primary-800">Resumen:</span> <span className="whitespace-pre-wrap">{reporte.contenido.resumen}</span></div>}
                  {reporte.contenido.pendientes && <div><span className="font-medium text-primary-800">Pendientes:</span> <span className="whitespace-pre-wrap">{reporte.contenido.pendientes}</span></div>}
                  {reporte.contenido.observaciones && <div><span className="font-medium text-primary-800">Observaciones:</span> <span className="whitespace-pre-wrap">{reporte.contenido.observaciones}</span></div>}
                </div>
              ) : (
                <p className="text-sm text-primary-800/80 whitespace-pre-wrap">{String(reporte.contenido || '')}</p>
              )}
              {reporte.firmas?.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gold-600">Firmas: {reporte.firmas.map(f => f.padre?.nombre_completo).join(', ')}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crear Reporte */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Reporte Semanal - Colegio Harvard" size="lg">
        <form onSubmit={handleCrear} className="space-y-4">
          <div className="bg-cream-50 p-3 rounded-lg">
            <p className="text-xs text-gold-600">Publicando para:</p>
            <p className="text-sm font-medium text-primary-800">{alumno.nombre_completo}</p>
            <p className="text-xs text-cream-400">{gradoNombre} "{seccion}"</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Inicio de Semana</label>
              <input type="date" value={form.semana_inicio} onChange={(e) => setForm({ ...form, semana_inicio: e.target.value })} required
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Fin de Semana</label>
              <input type="date" value={form.semana_fin} onChange={(e) => setForm({ ...form, semana_fin: e.target.value })} required
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Logros</label>
            <textarea value={form.logros} onChange={(e) => setForm({ ...form, logros: e.target.value })} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" rows={3} placeholder="Logros alcanzados durante la semana" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Resumen</label>
            <textarea value={form.resumen} onChange={(e) => setForm({ ...form, resumen: e.target.value })} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" rows={3} placeholder="Resumen general de la semana" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Pendientes</label>
            <textarea value={form.pendientes} onChange={(e) => setForm({ ...form, pendientes: e.target.value })}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" rows={2} placeholder="Tareas o actividades pendientes" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" rows={2} placeholder="Observaciones adicionales" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Crear</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReportesAlumno;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { obtenerAlumno } from '../services/alumnosService';
import { listarAgenda, publicarAgenda, firmarAgenda } from '../services/agendaService';
import { formatFecha, todayLimaISO } from '../utils/formatters';
import { HiArrowLeft, HiPlus, HiCheck, HiBookOpen } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';

const AgendaAlumno = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [alumno, setAlumno] = useState(null);
  const [entradas, setEntradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalPublicar, setModalPublicar] = useState(false);
  const [form, setForm] = useState({ contenido: '', fecha: todayLimaISO() });

  const canPublish = [ROLES.TUTOR, ROLES.SUPER_ADMIN].includes(usuario?.rol_codigo);
  const isPadre = usuario?.rol_codigo === ROLES.PADRE;

  useSocket('agenda:nueva', () => fetchEntradas());

  const fetchEntradas = async () => {
    try {
      const { data } = await listarAgenda({ id_alumno: id });
      setEntradas(data.data || []);
    } catch {
      toast.error('Error al cargar agenda');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const alumnoR = await obtenerAlumno(id);
        setAlumno(alumnoR.data.data);
        await fetchEntradas();
      } catch {
        toast.error('Error al cargar datos del alumno');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handlePublicar = async (e) => {
    e.preventDefault();
    try {
      await publicarAgenda({
        contenido_texto: form.contenido,
        fecha: form.fecha,
        id_alumno: parseInt(id),
        id_aula: alumno?.id_aula || alumno?.tbl_aulas?.id,
        alcance: 'ALUMNO',
      });
      toast.success('Entrada publicada');
      setModalPublicar(false);
      setForm({ contenido: '', fecha: todayLimaISO() });
      fetchEntradas();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al publicar');
    }
  };

  const handleFirmar = async (id_entrada) => {
    try {
      await firmarAgenda({ id_entrada_agenda: id_entrada });
      toast.success('Agenda firmada');
      fetchEntradas();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al firmar');
    }
  };

  const goBack = () => {
    if (isPadre) {
      navigate('/agenda');
    } else if (alumno?.id_aula || alumno?.tbl_aulas?.id) {
      navigate(`/agenda/aula/${alumno.id_aula || alumno.tbl_aulas?.id}`);
    } else {
      navigate('/agenda');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!alumno) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => navigate('/agenda')} className="flex items-center gap-2 mb-4 text-primary-800/70 hover:text-primary-800">
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
        {canPublish && (
          <button
            onClick={() => setModalPublicar(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium"
          >
            <HiPlus className="w-4 h-4" /> Publicar
          </button>
        )}
      </div>

      {/* Entradas */}
      {entradas.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <HiBookOpen className="w-12 h-12 text-cream-300 mx-auto mb-3" />
            <p className="text-gold-600">No hay entradas de agenda para este alumno</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {entradas.map(entrada => (
            <Card key={entrada.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gold-600">{formatFecha(entrada.fecha)}</p>
                    <Badge variant={entrada.alcance === 'AULA' ? 'info' : 'default'}>
                      {entrada.alcance === 'AULA' ? 'Aula' : 'Individual'}
                    </Badge>
                  </div>
                  <p className="text-xs text-cream-400 mt-0.5">Publicado por: {entrada.tutor?.nombres}</p>
                </div>
                {isPadre && (
                  <div className="flex gap-2">
                    {!entrada.firmada ? (
                      <button
                        onClick={() => handleFirmar(entrada.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <HiCheck className="w-3 h-3" /> Firmar
                      </button>
                    ) : (
                      <Badge variant="success">Firmada</Badge>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm text-primary-800/80 whitespace-pre-wrap">{entrada.contenido}</p>

              {entrada.firmas?.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gold-600 mb-1">Firmas ({entrada.firmas.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {entrada.firmas.map(f => (
                      <Badge key={f.id} variant="success">{f.padre?.nombre_completo || 'Padre'}</Badge>
                    ))}
                  </div>
                </div>
              )}

            </Card>
          ))}
        </div>
      )}

      {/* Modal Publicar */}
      <Modal isOpen={modalPublicar} onClose={() => setModalPublicar(false)} title="Publicar Entrada de Agenda" size="lg">
        <form onSubmit={handlePublicar} className="space-y-4">
          <div className="bg-cream-50 p-3 rounded-lg">
            <p className="text-xs text-gold-600">Publicando para:</p>
            <p className="text-sm font-medium text-primary-800">{alumno.nombre_completo}</p>
            <p className="text-xs text-cream-400">{gradoNombre} "{seccion}"</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Contenido</label>
            <textarea
              value={form.contenido}
              onChange={(e) => setForm({ ...form, contenido: e.target.value })}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none"
              rows={5}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalPublicar(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">
              Publicar
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AgendaAlumno;

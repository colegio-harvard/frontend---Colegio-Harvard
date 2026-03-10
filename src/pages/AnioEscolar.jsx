import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { listarAlumnos } from '../services/alumnosService';
import { listarAnios, listarAulas } from '../services/configEscolarService';
import { migrarAlumnos, clonarAulas } from '../services/anioEscolarService';
import { HiSwitchHorizontal } from 'react-icons/hi';
import toast from 'react-hot-toast';

const AnioEscolar = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [anios, setAnios] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMigrar, setModalMigrar] = useState(false);
  const [seleccion, setSeleccion] = useState({});
  const [anioDestino, setAnioDestino] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alumnosR, aniosR, aulasR] = await Promise.all([
        listarAlumnos(),
        listarAnios(),
        listarAulas(),
      ]);
      setAlumnos(alumnosR.data.data || []);
      setAnios(aniosR.data.data || []);
      setAulas(aulasR.data.data || []);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSeleccion = (id_alumno, accion) => {
    setSeleccion(prev => ({ ...prev, [id_alumno]: accion }));
  };

  const handleMigrar = async () => {
    const migraciones = Object.entries(seleccion).map(([id_alumno, accion]) => ({
      id_alumno: parseInt(id_alumno),
      accion,
    }));
    if (migraciones.length === 0) {
      toast.error('Seleccione al menos un alumno');
      return;
    }
    try {
      await migrarAlumnos({ id_anio_destino: parseInt(anioDestino), migraciones });
      toast.success('Migración completada');
      setModalMigrar(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleClonar = async () => {
    const anioActivo = anios.find(a => a.activo);
    if (!anioActivo) {
      toast.error('No hay año escolar activo');
      return;
    }
    try {
      await clonarAulas({ id_anio_origen: anioActivo.id, id_anio_destino: parseInt(anioDestino) });
      toast.success('Aulas clonadas');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  if (loading) return <LoadingSpinner />;

  const columns = [
    { header: 'Código', accessor: 'codigo_alumno' },
    { header: 'Nombre', accessor: 'nombre_completo' },
    { header: 'Aula', render: (r) => r.aula ? `${r.aula.grado?.nombre} ${r.aula.seccion}` : '-' },
    { header: 'Estado', render: (r) => <Badge variant={r.estado === 'ACTIVO' ? 'success' : 'danger'}>{r.estado}</Badge> },
    { header: 'Acción', render: (r) => (
      <select value={seleccion[r.id] || ''} onChange={(e) => handleSeleccion(r.id, e.target.value)}
        className="px-2 py-1 text-xs border border-cream-300 rounded outline-none">
        <option value="">Sin acción</option>
        <option value="PASA">Pasa de grado</option>
        <option value="REPITENTE">Repitente</option>
        <option value="RETIRADO">Retirado</option>
      </select>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Gestión de año escolar</h1>
        <button onClick={() => setModalMigrar(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
          <HiSwitchHorizontal className="w-4 h-4" /> Migrar
        </button>
      </div>

      <Card title="Alumnos">
        <DataTable columns={columns} data={alumnos.filter(a => a.estado === 'ACTIVO')} loading={false} />
      </Card>

      <Modal isOpen={modalMigrar} onClose={() => setModalMigrar(false)} title="Migrar Alumnos" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Año Destino</label>
            <select value={anioDestino} onChange={(e) => setAnioDestino(e.target.value)} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
              <option value="">Seleccione...</option>
              {anios.map(a => <option key={a.id} value={a.id}>{a.anio}</option>)}
            </select>
          </div>
          <p className="text-sm text-primary-800/70">
            Alumnos seleccionados: {Object.keys(seleccion).filter(k => seleccion[k]).length}
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={handleMigrar} className="w-full py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">
              Ejecutar Migración
            </button>
            <button onClick={handleClonar} disabled={!anioDestino} className="w-full py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              Clonar Aulas al Año Destino
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AnioEscolar;

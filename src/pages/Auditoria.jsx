import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import { listarAuditoria, listarAcciones, exportarExcelAuditoria } from '../services/auditoriaService';
import { formatFechaHora } from '../utils/formatters';
import { HiDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Auditoria = () => {
  const [registros, setRegistros] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ accion: '', fecha_inicio: '', fecha_fin: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.accion) params.codigo_accion = filtros.accion;
      if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
      if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin;
      const [registrosR, accionesR] = await Promise.all([
        listarAuditoria(params),
        listarAcciones(),
      ]);
      setRegistros(registrosR.data.data || []);
      setAcciones(accionesR.data.data || []);
    } catch {
      toast.error('Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExportar = async () => {
    try {
      const params = {};
      if (filtros.accion) params.codigo_accion = filtros.accion;
      if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
      if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin;
      const response = await exportarExcelAuditoria(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'auditoria.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar');
    }
  };

  const columns = [
    { header: 'Fecha', render: (r) => formatFechaHora(r.fecha_hora) },
    { header: 'Usuario', render: (r) => r.usuario?.nombres || `ID: ${r.id_usuario}` },
    { header: 'Acción', accessor: 'accion' },
    { header: 'Entidad', accessor: 'tipo_entidad' },
    { header: 'ID Entidad', accessor: 'id_entidad' },
    { header: 'Resumen', accessor: 'resumen' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Auditoría</h1>
        <button onClick={handleExportar} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
          <HiDownload className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Acción</label>
            <select value={filtros.accion} onChange={(e) => setFiltros({...filtros, accion: e.target.value})}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm">
              <option value="">Todas</option>
              {acciones.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Desde</label>
            <input type="date" value={filtros.fecha_inicio} onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Hasta</label>
            <input type="date" value={filtros.fecha_fin} onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" />
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
            Filtrar
          </button>
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={registros} loading={loading} emptyMessage="No hay registros de auditoría" rowsPerPage={15} />
      </Card>
    </div>
  );
};

export default Auditoria;

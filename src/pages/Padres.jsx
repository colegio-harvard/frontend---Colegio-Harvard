import { useState, useEffect, useMemo } from 'react';
import { fileUrl } from '../utils/constants';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { listarPadres, obtenerPadre, crearPadre, actualizarPadre, eliminarPadre } from '../services/padresService';
import { formatFechaHora } from '../utils/formatters';
import { HiPlus, HiPencil, HiTrash, HiEye, HiEyeOff, HiUser, HiPhone, HiIdentification, HiAcademicCap, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Padres = () => {
  const [padres, setPadres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [perfilData, setPerfilData] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await listarPadres();
      setPadres(data.data || []);
    } catch {
      toast.error('Error al cargar padres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await actualizarPadre(editando.id, { dni: form.dni, nombre_completo: form.nombre_completo, celular: form.celular });
        toast.success('Padre actualizado');
      } else {
        await crearPadre(form);
        toast.success('Padre creado');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await eliminarPadre(id);
      toast.success('Padre eliminado');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const openCreate = () => {
    setEditando(null);
    setForm({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditando(p);
    setForm({ dni: p.dni, nombre_completo: p.nombre_completo, celular: p.celular || '', username: '', contrasena: '' });
    setModalOpen(true);
  };

  const openPerfil = async (padre) => {
    setPerfilOpen(true);
    setPerfilLoading(true);
    try {
      const { data } = await obtenerPadre(padre.id);
      setPerfilData(data.data);
    } catch {
      toast.error('Error al cargar perfil del padre');
      setPerfilOpen(false);
    } finally {
      setPerfilLoading(false);
    }
  };

  const padresFiltrados = useMemo(() => {
    if (!busqueda.trim()) return padres;
    const term = busqueda.toLowerCase().trim();
    return padres.filter(p =>
      p.nombre_completo?.toLowerCase().includes(term) ||
      p.dni?.toLowerCase().includes(term)
    );
  }, [padres, busqueda]);

  const columns = [
    { header: 'ID', accessor: 'id' },
    { header: 'DNI', accessor: 'dni' },
    { header: 'Nombre', accessor: 'nombre_completo' },
    { header: 'Celular', accessor: 'celular' },
    { header: 'Usuario', render: (r) => r.usuario?.username || '-' },
    { header: 'Hijos', render: (r) => r.hijos?.length || 0 },
    { header: 'Acciones', render: (row) => (
      <div className="flex gap-1">
        <button onClick={() => openPerfil(row)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded" title="Ver perfil"><HiEye className="w-4 h-4" /></button>
        <button onClick={() => openEdit(row)} className="p-1.5 text-gold-600 hover:bg-gold-50 rounded" title="Editar"><HiPencil className="w-4 h-4" /></button>
        <button onClick={() => setDeleteConfirm({ open: true, id: row.id })} className="p-1.5 text-gold-600 hover:bg-gold-50 rounded" title="Eliminar"><HiTrash className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Padres de Familia</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
          <HiPlus className="w-4 h-4" /> Nuevo Padre
        </button>
      </div>

      <div className="mb-4">
        <div className="relative w-full max-w-md">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full pl-10 pr-4 py-2 border border-cream-300 rounded-lg outline-none text-sm focus:border-gold-400 focus:ring-1 focus:ring-gold-200 transition-colors"
          />
        </div>
      </div>

      <Card>
        <DataTable columns={columns} data={padresFiltrados} loading={loading} emptyMessage={busqueda ? 'No se encontraron resultados' : 'No hay padres registrados'} rowsPerPage={10} />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Padre' : 'Nuevo Padre'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">DNI</label>
            <input type="text" value={form.dni} onChange={(e) => setForm({...form, dni: e.target.value})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" maxLength={8} />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Nombre Completo</label>
            <input type="text" value={form.nombre_completo} onChange={(e) => setForm({...form, nombre_completo: e.target.value})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Celular</label>
            <input type="text" value={form.celular} onChange={(e) => setForm({...form, celular: e.target.value})}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" maxLength={15} />
          </div>
          {!editando && (
            <>
              <div>
                <label className="block text-sm font-medium text-primary-800/80 mb-1">Username (para acceso al sistema)</label>
                <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-800/80 mb-1">Contraseña</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'}
                    value={form.contrasena} onChange={(e) => setForm({...form, contrasena: e.target.value})} required
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none pr-10" placeholder="Ingrese contraseña" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 hover:text-gold-600 transition-colors">
                    {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">{editando ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Perfil */}
      <Modal isOpen={perfilOpen} onClose={() => { setPerfilOpen(false); setPerfilData(null); }} title="Perfil del Padre" size="lg">
        {perfilLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : perfilData ? (
          <div className="space-y-5">
            {/* Info del padre */}
            <div className="bg-cream-50 rounded-xl p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
                  <span className="text-white text-xl font-bold">{perfilData.nombre_completo?.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary-800 font-display">{perfilData.nombre_completo}</h3>
                  <Badge variant={perfilData.usuario?.estado === 'ACTIVO' ? 'success' : 'danger'}>
                    {perfilData.usuario?.estado || 'Sin cuenta'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-primary-800/70">
                  <HiIdentification className="w-4 h-4 text-gold-500" />
                  <span><span className="font-medium">DNI:</span> {perfilData.dni}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary-800/70">
                  <HiPhone className="w-4 h-4 text-gold-500" />
                  <span><span className="font-medium">Celular:</span> {perfilData.celular || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary-800/70">
                  <HiUser className="w-4 h-4 text-gold-500" />
                  <span><span className="font-medium">Usuario:</span> {perfilData.usuario?.username || '—'}</span>
                </div>
                {perfilData.date_time_registration && (
                  <div className="flex items-center gap-2 text-sm text-primary-800/70">
                    <HiAcademicCap className="w-4 h-4 text-gold-500" />
                    <span><span className="font-medium">Registro:</span> {formatFechaHora(perfilData.date_time_registration)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hijos */}
            <div>
              <h4 className="text-sm font-semibold text-primary-800/80 mb-3 flex items-center gap-2">
                <HiAcademicCap className="w-4 h-4 text-gold-500" />
                Hijos vinculados ({perfilData.hijos?.length || 0})
              </h4>
              {perfilData.hijos?.length > 0 ? (
                <div className="space-y-2">
                  {perfilData.hijos.map(hijo => (
                    <div key={hijo.id} className="flex items-center gap-3 p-3 bg-white border border-cream-200 rounded-lg">
                      {hijo.foto_url ? (
                        <img src={fileUrl(hijo.foto_url)} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-gold-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 text-sm font-bold">{hijo.nombre_completo?.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary-800 truncate">{hijo.nombre_completo}</p>
                        <p className="text-xs text-gold-600">
                          {hijo.codigo_alumno}
                          {hijo.aula && ` — ${hijo.aula.grado} "${hijo.aula.seccion}" (${hijo.aula.nivel})`}
                        </p>
                      </div>
                      <Badge variant={hijo.estado === 'ACTIVO' ? 'success' : 'warning'}>{hijo.estado}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-cream-400 text-center py-4">No tiene hijos vinculados</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog isOpen={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => handleDelete(deleteConfirm.id)} title="Eliminar Padre"
        message="¿Está seguro de eliminar este padre? Se eliminará también su cuenta de usuario." confirmText="Eliminar" />
    </div>
  );
};

export default Padres;

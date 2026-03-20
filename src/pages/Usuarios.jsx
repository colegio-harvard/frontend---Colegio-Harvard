import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';
import { listarRoles, listarUsuarios, crearUsuario, actualizarUsuario, resetearContrasena, eliminarUsuario } from '../services/usuariosService';
import { ROLES_LABELS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { HiPlus, HiPencil, HiKey, HiTrash, HiEye, HiEyeOff } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Usuarios = () => {
  const { usuario: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [editando, setEditando] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [form, setForm] = useState({ username: '', nombres: '', contrasena: '', id_rol: '', estado: 'ACTIVO' });
  const [resetForm, setResetForm] = useState({ id: null, nueva_contrasena: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usuariosRes, rolesRes] = await Promise.all([listarUsuarios(), listarRoles()]);
      setUsuarios(usuariosRes.data.data || []);
      const allRoles = rolesRes.data.data || [];
      // ADMIN solo puede crear PADRE; SUPER_ADMIN ve todos excepto PADRE
      if (currentUser?.rol_codigo === 'ADMIN') {
        setRoles(allRoles.filter(r => r.codigo === 'PADRE'));
      } else {
        setRoles(allRoles.filter(r => r.codigo !== 'PADRE'));
      }
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await actualizarUsuario(editando.id, form);
        toast.success('Usuario actualizado');
      } else {
        await crearUsuario(form);
        toast.success('Usuario creado');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await resetearContrasena(resetForm.id, { nueva_contrasena: resetForm.nueva_contrasena });
      toast.success('Contraseña restablecida');
      setResetModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await eliminarUsuario(id);
      toast.success('Usuario eliminado');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const openCreate = () => {
    setEditando(null);
    setForm({ username: '', nombres: '', contrasena: '', id_rol: '', estado: 'ACTIVO' });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditando(u);
    setForm({ username: u.username, nombres: u.nombres, contrasena: '', id_rol: u.id_rol, estado: u.estado });
    setModalOpen(true);
  };

  const columns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Usuario', accessor: 'username' },
    { header: 'Nombres', accessor: 'nombres' },
    { header: 'Rol', render: (row) => <Badge variant="info">{ROLES_LABELS[row.rol?.codigo] || row.rol?.codigo}</Badge> },
    { header: 'Estado', render: (row) => (
      <Badge variant={row.estado === 'ACTIVO' ? 'success' : 'danger'}>{row.estado}</Badge>
    )},
    { header: 'Acciones', render: (row) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 text-gold-600 hover:bg-gold-50 rounded" title="Editar">
          <HiPencil className="w-4 h-4" />
        </button>
        <button onClick={() => { setResetForm({ id: row.id, nueva_contrasena: '' }); setResetModalOpen(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Resetear contraseña">
          <HiKey className="w-4 h-4" />
        </button>
        <button onClick={() => setDeleteConfirm({ open: true, id: row.id })} className="p-1.5 text-gold-600 hover:bg-gold-50 rounded" title="Eliminar">
          <HiTrash className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Usuarios</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
          <HiPlus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      <Card>
        <DataTable columns={columns} data={usuarios} loading={loading} emptyMessage="No hay usuarios registrados" rowsPerPage={10} />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Username</label>
            <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-gold-300 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Nombres</label>
            <input type="text" value={form.nombres} onChange={(e) => setForm({...form, nombres: e.target.value})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-gold-300 outline-none" />
          </div>
          {!editando && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Contraseña</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'}
                  value={form.contrasena} onChange={(e) => setForm({...form, contrasena: e.target.value})} required
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-gold-300 outline-none pr-10" placeholder="Ingrese contraseña" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 hover:text-gold-600 transition-colors">
                  {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Rol</label>
            <select value={form.id_rol} onChange={(e) => setForm({...form, id_rol: parseInt(e.target.value)})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-gold-300 outline-none">
              <option value="">Seleccione...</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
          {editando && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Estado</label>
              <select value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})}
                className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-gold-300 outline-none">
                <option value="ACTIVO">Activo</option>
                <option value="BLOQUEADO">Bloqueado</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">
              {editando ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title="Restablecer Contraseña" size="sm">
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Nueva Contraseña</label>
            <div className="relative">
              <input type={showResetPassword ? 'text' : 'password'}
                value={resetForm.nueva_contrasena} onChange={(e) => setResetForm({...resetForm, nueva_contrasena: e.target.value})} required
                className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-gold-300 outline-none pr-10" placeholder="Ingrese nueva contraseña" />
              <button type="button" onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 hover:text-gold-600 transition-colors">
                {showResetPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setResetModalOpen(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-yellow-600 rounded-lg hover:bg-yellow-700">Restablecer</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        title="Eliminar Usuario"
        message="¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
      />
    </div>
  );
};

export default Usuarios;

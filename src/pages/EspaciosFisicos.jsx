import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as s from '../services/horariosService';

const nuevoEspacio = {
  nombre: '', tipo: 'OTRO', capacidad: '', capacidad_simultanea: 1, ubicacion: '', observacion: '',
};

export default function EspaciosFisicos() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const cargar = () => s.listarEspacios({ incluir_inactivos: true })
    .then(r => setItems(r.data.data || []))
    .catch(() => toast.error('No se pudieron listar espacios'));
  useEffect(cargar, []);

  const guardar = async e => {
    e.preventDefault();
    const capacidadSimultanea = Number(form.capacidad_simultanea);
    if (!Number.isInteger(capacidadSimultanea) || capacidadSimultanea < 1) {
      toast.error('La capacidad simultánea debe ser un entero mayor o igual a 1');
      return;
    }
    try {
      const datos = { ...form, capacidad_simultanea: capacidadSimultanea };
      if (form.id) await s.actualizarEspacio(form.id, datos);
      else await s.crearEspacio(datos);
      setForm(null); cargar(); toast.success('Espacio guardado');
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo guardar'); }
  };

  return <div className="space-y-5">
    <div className="flex justify-between"><div><h1 className="page-title">Espacios físicos</h1><p className="page-subtitle">Ambientes reales del colegio.</p></div><button className="btn-primary" onClick={() => setForm(nuevoEspacio)}>+ Nuevo espacio</button></div>
    {form && <form onSubmit={guardar} className="card grid md:grid-cols-2 gap-3">
      {[
        ['nombre', 'Nombre'], ['tipo', 'Tipo'], ['capacidad', 'Capacidad'], ['capacidad_simultanea', 'Capacidad simultánea'], ['ubicacion', 'Ubicación'], ['observacion', 'Observación'],
      ].map(([campo, etiqueta]) => <label key={campo}>{etiqueta}<input className="input-field mt-1" type={campo === 'capacidad_simultanea' ? 'number' : 'text'} min={campo === 'capacidad_simultanea' ? 1 : undefined} step={campo === 'capacidad_simultanea' ? 1 : undefined} value={form[campo] ?? ''} onChange={e => setForm({ ...form, [campo]: e.target.value })} /></label>)}
      <div><button className="btn-primary">Guardar</button></div>
    </form>}
    <div className="card overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th>Nombre</th><th>Tipo</th><th>Capacidad</th><th>Uso simultáneo</th><th>Ubicación</th><th>Estado</th><th /></tr></thead><tbody>{items.map(x => <tr key={x.id}><td>{x.nombre}</td><td>{x.tipo}</td><td>{x.capacidad || '—'}</td><td>{x.capacidad_simultanea || 1} clase(s)</td><td>{x.ubicacion || '—'}</td><td>{x.activo ? 'Activo' : 'Inactivo'}</td><td><button onClick={() => setForm({ ...x, capacidad_simultanea: x.capacidad_simultanea || 1 })}>Editar</button>{' '}<button onClick={async () => { await s.cambiarEstadoEspacio(x.id, !x.activo); cargar(); }}>{x.activo ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table></div>
  </div>;
}

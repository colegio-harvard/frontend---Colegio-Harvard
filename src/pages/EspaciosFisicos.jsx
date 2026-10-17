import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiCalendar, HiCheckCircle, HiOfficeBuilding, HiPencil, HiPlus, HiSwitchHorizontal, HiUserGroup } from 'react-icons/hi';
import * as s from '../services/horariosService';

const nuevoEspacio = {
  nombre: '', tipo: 'OTRO', capacidad: '', capacidad_simultanea: 1, ubicacion: '', observacion: '',
};

export default function EspaciosFisicos() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const activos = items.filter(item => item.activo).length;
  const usoSimultaneoTotal = items.reduce((total, item) => total + (Number(item.capacidad_simultanea) || 1), 0);
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

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="page-title">Espacios físicos</h1>
        <p className="page-subtitle">Ambientes reales del colegio.</p>
      </div>
      <button className="btn-primary inline-flex items-center justify-center gap-2" onClick={() => setForm(nuevoEspacio)}>
        <HiPlus className="text-lg" /> Nuevo espacio
      </button>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <Resumen icon={<HiOfficeBuilding />} etiqueta="Total de espacios" valor={items.length} color="text-primary-700 bg-primary-50" />
      <Resumen icon={<HiCheckCircle />} etiqueta="Espacios activos" valor={activos} color="text-emerald-700 bg-emerald-50" />
      <Resumen icon={<HiUserGroup />} etiqueta="Uso simultáneo total" valor={`${usoSimultaneoTotal} clases`} color="text-amber-700 bg-amber-50" />
    </div>

    {form && <form onSubmit={guardar} className="card-harvard grid gap-4 p-5 md:grid-cols-2">
      <div className="md:col-span-2"><h2 className="font-display text-lg font-bold text-primary-900">{form.id ? 'Editar espacio' : 'Nuevo espacio'}</h2><p className="mt-1 text-sm text-cream-600">Registra únicamente los datos del ambiente físico.</p></div>
      {[
        ['nombre', 'Nombre'], ['tipo', 'Tipo'], ['capacidad', 'Capacidad'], ['capacidad_simultanea', 'Capacidad simultánea'], ['ubicacion', 'Ubicación'], ['observacion', 'Observación'],
      ].map(([campo, etiqueta]) => <label key={campo} className="text-sm font-semibold text-primary-800">{etiqueta}<input className="input-field mt-1" type={campo === 'capacidad_simultanea' ? 'number' : 'text'} min={campo === 'capacidad_simultanea' ? 1 : undefined} step={campo === 'capacidad_simultanea' ? 1 : undefined} value={form[campo] ?? ''} onChange={e => setForm({ ...form, [campo]: e.target.value })} /></label>)}
      <div className="flex gap-3 md:col-span-2"><button className="btn-primary">Guardar</button><button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button></div>
    </form>}

    <div className="card-harvard overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[880px] w-full text-left text-sm">
          <thead className="bg-cream-100 text-xs uppercase tracking-wide text-primary-800">
            <tr><th className="px-5 py-4 font-bold">Nombre</th><th className="px-4 py-4 font-bold">Tipo</th><th className="px-4 py-4 font-bold">Capacidad</th><th className="px-4 py-4 font-bold">Uso simultáneo</th><th className="px-4 py-4 font-bold">Ubicación</th><th className="px-4 py-4 font-bold">Estado</th><th className="px-5 py-4 text-right font-bold">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {items.map(x => <tr key={x.id} className="transition-colors hover:bg-cream-50/70">
              <td className="px-5 py-4 font-semibold text-primary-900">{x.nombre}</td>
              <td className="px-4 py-4"><TipoBadge tipo={x.tipo} /></td>
              <td className="px-4 py-4 text-cream-700">{x.capacidad || 'No aplica'}</td>
              <td className="px-4 py-4"><span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">{x.capacidad_simultanea || 1} {(x.capacidad_simultanea || 1) === 1 ? 'clase' : 'clases'}</span></td>
              <td className="px-4 py-4 text-cream-700">{x.ubicacion || 'Sin registrar'}</td>
              <td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${x.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{x.activo ? 'Activo' : 'Inactivo'}</span></td>
              <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" title="Ver horario del espacio" aria-label={`Ver horario del espacio ${x.nombre}`} className="rounded-lg border border-cream-300 p-2 text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50" onClick={() => navigate(`/horarios/espacios/${x.id}/horario`)}><HiCalendar /></button><button type="button" title="Editar espacio" aria-label={`Editar espacio ${x.nombre}`} className="rounded-lg border border-cream-300 p-2 text-primary-700 transition hover:border-primary-400 hover:bg-primary-50" onClick={() => setForm({ ...x, capacidad_simultanea: x.capacidad_simultanea || 1 })}><HiPencil /></button><button type="button" title={x.activo ? 'Desactivar espacio' : 'Activar espacio'} aria-label={`${x.activo ? 'Desactivar' : 'Activar'} espacio ${x.nombre}`} className="rounded-lg border border-cream-300 p-2 text-amber-700 transition hover:border-amber-300 hover:bg-amber-50" onClick={async () => { await s.cambiarEstadoEspacio(x.id, !x.activo); cargar(); }}><HiSwitchHorizontal /></button></div></td>
            </tr>)}
            {!items.length && <tr><td colSpan="7" className="px-5 py-12 text-center text-cream-600">No hay espacios físicos registrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}

function Resumen({ icon, etiqueta, valor, color }) {
  return <div className="card-harvard flex items-center gap-4 p-4"><span className={`rounded-xl p-3 text-xl ${color}`}>{icon}</span><div><p className="text-xs font-semibold uppercase tracking-wide text-cream-600">{etiqueta}</p><p className="mt-1 text-xl font-bold text-primary-900">{valor}</p></div></div>;
}

function TipoBadge({ tipo }) {
  const tonos = { AULA: 'bg-blue-50 text-blue-800', COMPUTO: 'bg-teal-50 text-teal-800', DEPORTIVO: 'bg-orange-50 text-orange-800' };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tonos[tipo] || 'bg-slate-100 text-slate-700'}`}>{tipo || 'OTRO'}</span>;
}

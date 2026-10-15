import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import * as horarios from '../../services/horariosService';

const hora = valor => String(valor || '').slice(0, 5);
const error = evento => evento.response?.data?.error || 'No se pudo completar la operación';

export default function ClaseModal({ open, onClose, horario, celda, detalle, asignaciones, onSaved, onDeleted }) {
  const [form, setForm] = useState({ id_asignacion_academica: '', observacion: '', id_espacio_fisico: '' });
  const [espacios, setEspacios] = useState([]);

  useEffect(() => {
    setForm({ id_asignacion_academica: detalle?.id_asignacion_academica || '', observacion: detalle?.observacion || '', id_espacio_fisico: detalle?.id_espacio_fisico || '' });
    if (open) horarios.listarEspacios({ incluir_inactivos: true }).then(r => setEspacios(r.data.data || [])).catch(e => toast.error(error(e)));
  }, [detalle, open]);
  if (!celda) return null;
  const guardar = async event => { event.preventDefault(); if (!form.id_asignacion_academica) return toast.error('Seleccione una asignación académica.'); try { const data = { ...form, id_espacio_fisico: form.id_espacio_fisico || null, dia_semana: celda.dia, id_bloque_horario: celda.bloque.id }; if (detalle) await horarios.modificarClase(horario.id, detalle.id, data); else await horarios.agregarClase(horario.id, data); toast.success('Clase guardada'); onSaved(); } catch (e) { toast.error(error(e)); } };
  return <Modal isOpen={open} onClose={onClose} title={detalle ? 'Editar clase' : 'Agregar clase'}><form onSubmit={guardar} className="space-y-4"><div className="rounded-lg bg-cream-50 p-3 text-sm"><b>{celda.dia}</b> · {celda.bloque.nombre} · {hora(celda.bloque.hora_inicio)} - {hora(celda.bloque.hora_fin)}</div><label className="block text-sm font-medium text-primary-800">Asignación académica<select className="input-field mt-1" value={form.id_asignacion_academica} onChange={e => setForm({ ...form, id_asignacion_academica: e.target.value })}><option value="">Seleccione</option>{asignaciones.map(a => <option key={a.id} value={a.id}>{a.curso} — {a.docente}</option>)}</select></label><label className="block text-sm font-medium text-primary-800">Espacio físico (opcional)<select className="input-field mt-1" value={form.id_espacio_fisico} onChange={e => setForm({ ...form, id_espacio_fisico: e.target.value })}><option value="">Sin espacio específico</option>{espacios.filter(x => x.activo || Number(x.id) === Number(detalle?.id_espacio_fisico)).map(x => <option key={x.id} value={x.id}>{x.nombre}{!x.activo ? ' (inactivo)' : ''}</option>)}</select></label><label className="block text-sm font-medium text-primary-800">Observación<textarea className="input-field mt-1" value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} /></label><div className="flex justify-between"><button type="button" className="text-primary-600" onClick={() => detalle && onDeleted(detalle)}>Eliminar clase</button><div className="flex gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary">Guardar cambios</button></div></div></form></Modal>;
}

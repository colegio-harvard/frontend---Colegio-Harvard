import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { obtenerPlantilla, obtenerEstadoPension, cuadriculaPensiones, registrarPago, obtenerDetalleMes } from '../services/pensionesService';
import { listarNiveles, listarGrados, listarAulas } from '../services/configEscolarService';
import { HiCheck, HiX, HiSearch, HiClock } from 'react-icons/hi';
import { formatFecha } from '../utils/formatters';
import toast from 'react-hot-toast';

const nombreMes = (p) => p.nombre || p.clave;

const formatMonto = (n) => `S/. ${Number(n || 0).toFixed(2)}`;

// ============================
// Badge de estado reutilizable
// ============================
const EstadoBadge = ({ estado }) => {
  if (estado === 'PAGADO') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><HiCheck className="w-3 h-3" /> Pagado</span>;
  if (estado === 'PAGO_PARCIAL') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><HiClock className="w-3 h-3" /> Parcial</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600"><HiX className="w-3 h-3" /> Pendiente</span>;
};

const Pensiones = () => {
  const { usuario } = useAuth();
  if (usuario?.rol_codigo === ROLES.PADRE) return <PensionPadre />;
  return <PensionAdmin />;
};

// ============================================================
// VISTA PADRE — Tabs por hijo + cards grandes + 3 estados
// ============================================================
const PensionPadre = () => {
  const [plantilla, setPlantilla] = useState([]);
  const [hijos, setHijos] = useState([]);
  const [hijoActivo, setHijoActivo] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [plantillaR, estadoR] = await Promise.all([
          obtenerPlantilla(),
          obtenerEstadoPension('me'),
        ]);
        setPlantilla(plantillaR.data.data || []);
        const hijosData = estadoR.data.data?.hijos || [];
        setHijos(hijosData);
      } catch {
        // silenciar
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <LoadingSpinner />;

  const hijoSeleccionado = hijos[hijoActivo] || null;

  return (
    <div>
      <h1 className="page-title mb-6">Estado de Pensiones</h1>

      {hijos.length === 0 ? (
        <Card><p className="text-center text-primary-800/60 py-8">No se encontraron datos de pensiones.</p></Card>
      ) : (
        <>
          {/* Tabs por hijo */}
          {hijos.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {hijos.map((hijo, idx) => (
                <button
                  key={hijo.id}
                  onClick={() => setHijoActivo(idx)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    idx === hijoActivo
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-cream-100 text-primary-800/70 hover:bg-cream-200'
                  }`}
                >
                  {hijo.nombre_completo}
                </button>
              ))}
            </div>
          )}

          {/* Nombre del hijo si es uno solo */}
          {hijos.length === 1 && (
            <p className="text-base font-semibold text-primary-800 mb-4">{hijos[0].nombre_completo}</p>
          )}

          {/* Cards de meses */}
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {plantilla.map(mes => {
                const estadoMes = hijoSeleccionado?.meses?.find(e => e.clave_mes === mes.clave);
                const estado = estadoMes?.estado || 'PENDIENTE';

                const cardStyles = {
                  PAGADO: 'border-emerald-300 bg-emerald-50',
                  PAGO_PARCIAL: 'border-amber-300 bg-amber-50',
                  PENDIENTE: 'border-red-200 bg-red-50/50',
                };
                const iconStyles = {
                  PAGADO: 'text-emerald-600',
                  PAGO_PARCIAL: 'text-amber-600',
                  PENDIENTE: 'text-red-400',
                };
                const labelStyles = {
                  PAGADO: 'text-emerald-700',
                  PAGO_PARCIAL: 'text-amber-700',
                  PENDIENTE: 'text-red-500',
                };
                const labels = {
                  PAGADO: 'Pagado',
                  PAGO_PARCIAL: 'Pago Parcial',
                  PENDIENTE: 'Pendiente',
                };
                const IconComp = estado === 'PAGADO' ? HiCheck : estado === 'PAGO_PARCIAL' ? HiClock : HiX;

                return (
                  <div key={mes.clave} className={`flex flex-col items-center p-6 rounded-xl border-2 ${cardStyles[estado]}`}>
                    <span className="text-base font-semibold text-primary-800">{nombreMes(mes)}</span>

                    {/* Comentario de la plantilla (del superadmin) — debajo del mes */}
                    {mes.comentario && (
                      <p className="mt-1 text-xs text-primary-800/50 italic text-center leading-snug">{mes.comentario}</p>
                    )}

                    <IconComp className={`w-10 h-10 mt-3 ${iconStyles[estado]}`} />
                    <span className={`text-sm mt-2 font-semibold ${labelStyles[estado]}`}>
                      {labels[estado]}
                    </span>

                    {/* Montos para pago parcial */}
                    {estado === 'PAGO_PARCIAL' && estadoMes && (
                      <div className="mt-2 text-center space-y-0.5">
                        <p className="text-xs text-primary-800/60">Total: {formatMonto(estadoMes.monto_total)}</p>
                        <p className="text-xs font-semibold text-amber-700">Pagado: {formatMonto(estadoMes.monto_pagado)}</p>
                        <p className="text-xs font-bold text-red-600">Saldo: {formatMonto((estadoMes.monto_total || 0) - (estadoMes.monto_pagado || 0))}</p>
                      </div>
                    )}

                    {/* Montos para pagado completo */}
                    {estado === 'PAGADO' && estadoMes?.monto_total && (
                      <p className="mt-2 text-xs text-emerald-600 font-medium">{formatMonto(estadoMes.monto_total)}</p>
                    )}

                    {/* Observacion del pago — debajo de la info de pago */}
                    {estadoMes?.pagos?.length > 0 && (() => {
                      const ultimaObs = [...estadoMes.pagos].reverse().find(p => p.observacion)?.observacion;
                      return ultimaObs ? (
                        <p className="mt-1 text-xs text-primary-800/50 italic text-center leading-snug">{ultimaObs}</p>
                      ) : null;
                    })()}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

// ============================================================
// VISTA ADMIN — Cuadricula + Modal de pago
// ============================================================
const PensionAdmin = () => {
  const [cuadricula, setCuadricula] = useState([]);
  const [plantilla, setPlantilla] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtros, setFiltros] = useState({ id_nivel: '', id_grado: '', id_aula: '' });
  const [busqueda, setBusqueda] = useState('');
  const [niveles, setNiveles] = useState([]);
  const [grados, setGrados] = useState([]);
  const [aulasDisponibles, setAulasDisponibles] = useState([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAlumno, setModalAlumno] = useState(null);
  const [modalMes, setModalMes] = useState(null);

  useEffect(() => {
    const fetchFiltros = async () => {
      try {
        const [nivelesR, gradosR, aulasR] = await Promise.all([
          listarNiveles(), listarGrados(), listarAulas(),
        ]);
        setNiveles(nivelesR.data.data || []);
        setGrados(gradosR.data.data || []);
        setAulasDisponibles(aulasR.data.data || []);
      } catch { /* silenciar */ }
    };
    fetchFiltros();
  }, []);

  const fetchData = async (paramOverride) => {
    setLoading(true);
    try {
      const f = paramOverride || filtros;
      const params = {};
      if (f.id_nivel) params.id_nivel = f.id_nivel;
      if (f.id_grado) params.id_grado = f.id_grado;
      if (f.id_aula) params.id_aula = f.id_aula;

      const [cuadR, plantR] = await Promise.all([
        cuadriculaPensiones(params),
        obtenerPlantilla(),
      ]);
      setCuadricula(cuadR.data.data || []);
      setPlantilla(plantR.data.data || []);
    } catch {
      toast.error('Error al cargar pensiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFiltrar = () => fetchData();

  const limpiarFiltros = () => {
    setFiltros({ id_nivel: '', id_grado: '', id_aula: '' });
    setBusqueda('');
    fetchData({ id_nivel: '', id_grado: '', id_aula: '' });
  };

  const abrirModal = (alumno, mes) => {
    setModalAlumno(alumno);
    setModalMes(mes);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setModalAlumno(null);
    setModalMes(null);
  };

  const handlePagoRegistrado = () => {
    cerrarModal();
    fetchData();
  };

  // Busqueda client-side
  const cuadriculaFiltrada = useMemo(() => {
    if (!busqueda.trim()) return cuadricula;
    const term = busqueda.toLowerCase();
    return cuadricula.filter(a => {
      const nombre = a.nombre_completo?.toLowerCase() || '';
      const codigo = a.codigo_alumno?.toLowerCase() || '';
      const dniAlumno = a.dni?.toLowerCase() || '';
      const padreNombre = a.padre?.nombre_completo?.toLowerCase() || '';
      const padreDni = a.padre?.dni?.toLowerCase() || '';
      return nombre.includes(term) || codigo.includes(term) || dniAlumno.includes(term) ||
             padreNombre.includes(term) || padreDni.includes(term);
    });
  }, [cuadricula, busqueda]);

  // Opciones cascading
  const gradosFiltrados = useMemo(() => {
    if (!filtros.id_nivel) return grados;
    return grados.filter(g => g.nivel?.id === parseInt(filtros.id_nivel));
  }, [grados, filtros.id_nivel]);

  const aulasFiltradas = useMemo(() => {
    let filtered = aulasDisponibles;
    if (filtros.id_nivel) filtered = filtered.filter(a => a.grado?.nivel?.id === parseInt(filtros.id_nivel));
    if (filtros.id_grado) filtered = filtered.filter(a => a.id_grado === parseInt(filtros.id_grado));
    return filtered;
  }, [aulasDisponibles, filtros.id_nivel, filtros.id_grado]);

  const hayFiltros = filtros.id_nivel || filtros.id_grado || filtros.id_aula || busqueda;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="page-title mb-6">Cuadrícula de Pensiones</h1>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Nivel</label>
            <select
              value={filtros.id_nivel}
              onChange={(e) => setFiltros({ ...filtros, id_nivel: e.target.value, id_grado: '', id_aula: '' })}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm bg-white"
            >
              <option value="">Todos</option>
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Grado</label>
            <select
              value={filtros.id_grado}
              onChange={(e) => setFiltros({ ...filtros, id_grado: e.target.value, id_aula: '' })}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm bg-white"
            >
              <option value="">Todos</option>
              {gradosFiltrados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Sección</label>
            <select
              value={filtros.id_aula}
              onChange={(e) => setFiltros({ ...filtros, id_aula: e.target.value })}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm bg-white"
            >
              <option value="">Todas</option>
              {aulasFiltradas.map(a => (
                <option key={a.id} value={a.id}>{a.grado?.nombre} {a.seccion}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Buscar</label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, DNI, código..."
                className="pl-9 pr-3 py-2 border border-cream-300 rounded-lg outline-none text-sm bg-white"
              />
            </div>
          </div>

          <button
            onClick={handleFiltrar}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium"
          >
            Filtrar
          </button>
        </div>

        {hayFiltros && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-200">
            <span className="text-xs text-primary-800/50">
              {cuadriculaFiltrada.length} alumno(s)
            </span>
            <button onClick={limpiarFiltros} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
              Limpiar filtros
            </button>
          </div>
        )}
      </Card>

      {/* Cuadricula */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-cream-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-gold-600 uppercase">Alumno</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gold-600 uppercase">DNI</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gold-600 uppercase">Padre/Apoderado</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gold-600 uppercase">Aula</th>
                {plantilla.map(p => (
                  <th key={p.clave} className="px-3 py-2 text-center text-xs font-medium text-gold-600 uppercase">{nombreMes(p)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuadriculaFiltrada.map(alumno => (
                <tr key={alumno.id} className="border-t hover:bg-cream-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary-800">{alumno.nombre_completo}</div>
                    <div className="text-xs text-gold-600">{alumno.codigo_alumno}</div>
                  </td>
                  <td className="px-3 py-2 text-sm text-primary-800/70">{alumno.dni || '-'}</td>
                  <td className="px-3 py-2 text-sm text-primary-800/70 whitespace-nowrap">
                    {alumno.padre?.nombre_completo || <span className="text-cream-400 italic">Sin vincular</span>}
                  </td>
                  <td className="px-3 py-2 text-sm text-primary-800/70 whitespace-nowrap">
                    {alumno.aula ? `${alumno.aula.grado?.nombre || ''} ${alumno.aula.seccion}` : '-'}
                  </td>
                  {plantilla.map(p => {
                    const est = alumno.pensiones?.find(e => e.clave_mes === p.clave);
                    const estado = est?.estado || 'PENDIENTE';

                    const btnColors = {
                      PAGADO: 'bg-emerald-500 text-white hover:bg-emerald-600',
                      PAGO_PARCIAL: 'bg-amber-400 text-white hover:bg-amber-500',
                      PENDIENTE: 'bg-cream-200 text-cream-400 hover:bg-cream-300',
                    };
                    const IconComp = estado === 'PAGADO' ? HiCheck : estado === 'PAGO_PARCIAL' ? HiClock : HiX;

                    return (
                      <td key={p.clave} className="px-3 py-2 text-center">
                        <button
                          onClick={() => abrirModal(alumno, p)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${btnColors[estado]}`}
                          title={estado === 'PAGO_PARCIAL' && est ? `Pagado: ${formatMonto(est.monto_pagado)} / ${formatMonto(est.monto_total)}` : estado}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de pago */}
      {modalOpen && modalAlumno && modalMes && (
        <ModalPago
          alumno={modalAlumno}
          mes={modalMes}
          onClose={cerrarModal}
          onSaved={handlePagoRegistrado}
        />
      )}
    </div>
  );
};

// ============================================================
// MODAL DE PAGO — Admin registra pagos
// ============================================================
const ModalPago = ({ alumno, mes, onClose, onSaved }) => {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulario
  const [accion, setAccion] = useState(''); // 'PAGADO', 'PAGO_PARCIAL', 'PENDIENTE', 'NUEVO_PAGO'
  const [montoTotal, setMontoTotal] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        const res = await obtenerDetalleMes(alumno.id, mes.clave);
        const d = res.data.data;
        setDetalle(d);

        // Pre-seleccionar accion según estado actual
        if (d.estado === 'PAGO_PARCIAL') {
          setAccion('NUEVO_PAGO');
          setMontoTotal(String(d.monto_total || ''));
        } else if (d.estado === 'PENDIENTE') {
          setAccion('');
        }
      } catch {
        toast.error('Error al cargar detalle');
      } finally {
        setLoading(false);
      }
    };
    fetchDetalle();
  }, [alumno.id, mes.clave]);

  const saldo = detalle ? (Number(detalle.monto_total || 0) - Number(detalle.monto_pagado || 0)) : 0;

  const handleGuardar = async () => {
    if (!accion) return;

    // Validaciones
    if (accion === 'PAGADO') {
      if (!montoTotal || parseFloat(montoTotal) <= 0) {
        return toast.error('Ingrese el monto total');
      }
    } else if (accion === 'PAGO_PARCIAL') {
      if (!montoTotal || parseFloat(montoTotal) <= 0) return toast.error('Ingrese el monto total');
      if (!montoPago || parseFloat(montoPago) <= 0) return toast.error('Ingrese el monto del pago');
      if (parseFloat(montoPago) >= parseFloat(montoTotal)) return toast.error('El monto del pago debe ser menor al total. Para pago completo, use "Pago Completo".');
    } else if (accion === 'NUEVO_PAGO') {
      if (!montoPago || parseFloat(montoPago) <= 0) return toast.error('Ingrese el monto del pago');
    }

    setSaving(true);
    try {
      if (accion === 'PAGADO') {
        await registrarPago({
          id_alumno: alumno.id,
          clave_mes: mes.clave,
          estado: 'PAGADO',
          monto_total: parseFloat(montoTotal),
          observacion: observacion || undefined,
        });
      } else if (accion === 'PAGO_PARCIAL') {
        await registrarPago({
          id_alumno: alumno.id,
          clave_mes: mes.clave,
          estado: 'PAGO_PARCIAL',
          monto_total: parseFloat(montoTotal),
          monto_pago: parseFloat(montoPago),
          observacion: observacion || undefined,
        });
      } else if (accion === 'NUEVO_PAGO') {
        await registrarPago({
          id_alumno: alumno.id,
          clave_mes: mes.clave,
          estado: 'PAGO_PARCIAL',
          monto_total: detalle.monto_total,
          monto_pago: parseFloat(montoPago),
          observacion: observacion || undefined,
        });
      } else if (accion === 'PENDIENTE') {
        await registrarPago({
          id_alumno: alumno.id,
          clave_mes: mes.clave,
          estado: 'PENDIENTE',
        });
      }

      toast.success('Pensión actualizada');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Pensión - ${nombreMes(mes)}`} size="lg">
      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-5">
          {/* Info del alumno */}
          <div className="flex items-center justify-between bg-cream-50 rounded-lg p-3">
            <div>
              <p className="text-sm font-semibold text-primary-800">{alumno.nombre_completo}</p>
              <p className="text-xs text-primary-800/60">{alumno.codigo_alumno} {alumno.aula ? `| ${alumno.aula.grado?.nombre || ''} ${alumno.aula.seccion}` : ''}</p>
            </div>
            <EstadoBadge estado={detalle?.estado || 'PENDIENTE'} />
          </div>

          {/* Resumen de montos (si tiene datos) */}
          {detalle?.estado !== 'PENDIENTE' && detalle?.monto_total && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600 font-medium">Total</p>
                <p className="text-lg font-bold text-blue-800">{formatMonto(detalle.monto_total)}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium">Pagado</p>
                <p className="text-lg font-bold text-emerald-800">{formatMonto(detalle.monto_pagado)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs text-red-600 font-medium">Saldo</p>
                <p className="text-lg font-bold text-red-800">{formatMonto(saldo)}</p>
              </div>
            </div>
          )}

          {/* Historial de pagos */}
          {detalle?.pagos?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-primary-800 mb-2">Historial de pagos</h4>
              <div className="border border-cream-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-cream-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gold-600">Fecha</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gold-600">Monto</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gold-600">Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.pagos.map((p, idx) => (
                      <tr key={idx} className="border-t border-cream-100">
                        <td className="px-3 py-2 text-primary-800/80">{formatFecha(p.fecha)}</td>
                        <td className="px-3 py-2 text-right font-medium text-primary-800">{formatMonto(p.monto)}</td>
                        <td className="px-3 py-2 text-primary-800/60">{p.observacion || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Acciones según estado actual */}
          {detalle?.estado === 'PENDIENTE' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-primary-800">Registrar pago</h4>

              {/* Tipo de pago */}
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${accion === 'PAGADO' ? 'border-emerald-400 bg-emerald-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <input type="radio" name="accion" value="PAGADO" checked={accion === 'PAGADO'} onChange={() => { setAccion('PAGADO'); setMontoPago(''); }} className="accent-emerald-600" />
                  <div>
                    <span className="text-sm font-semibold text-primary-800">Pago Completo</span>
                    <p className="text-xs text-primary-800/50">Marcar como pagado en su totalidad</p>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${accion === 'PAGO_PARCIAL' ? 'border-amber-400 bg-amber-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <input type="radio" name="accion" value="PAGO_PARCIAL" checked={accion === 'PAGO_PARCIAL'} onChange={() => setAccion('PAGO_PARCIAL')} className="accent-amber-600" />
                  <div>
                    <span className="text-sm font-semibold text-primary-800">Pago Parcial</span>
                    <p className="text-xs text-primary-800/50">Registrar un pago parcial</p>
                  </div>
                </label>
              </div>

              {/* Campos para pago completo */}
              {accion === 'PAGADO' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Monto Total (S/.)</label>
                    <input type="number" step="0.01" min="0" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" placeholder="Ej: 450.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Observación (opcional)</label>
                    <input type="text" value={observacion} onChange={(e) => setObservacion(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" placeholder="Ej: Pago en efectivo" />
                  </div>
                </div>
              )}

              {/* Campos para pago parcial */}
              {accion === 'PAGO_PARCIAL' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Monto Total de la pensión (S/.)</label>
                    <input type="number" step="0.01" min="0" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" placeholder="Ej: 450.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Monto de este pago (S/.)</label>
                    <input type="number" step="0.01" min="0" value={montoPago} onChange={(e) => setMontoPago(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" placeholder="Ej: 200.00" />
                  </div>
                  {montoTotal && montoPago && (
                    <p className="text-xs font-medium text-amber-700">
                      Saldo pendiente: {formatMonto(parseFloat(montoTotal) - parseFloat(montoPago))}
                    </p>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Observación (opcional)</label>
                    <input type="text" value={observacion} onChange={(e) => setObservacion(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" placeholder="Ej: Primer pago" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado PAGO_PARCIAL: registrar nuevo pago */}
          {detalle?.estado === 'PAGO_PARCIAL' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-primary-800">Registrar nuevo pago</h4>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${accion === 'NUEVO_PAGO' ? 'border-emerald-400 bg-emerald-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <input type="radio" name="accion_parcial" value="NUEVO_PAGO" checked={accion === 'NUEVO_PAGO'} onChange={() => setAccion('NUEVO_PAGO')} className="accent-emerald-600" />
                  <div>
                    <span className="text-sm font-semibold text-primary-800">Agregar Pago</span>
                    <p className="text-xs text-primary-800/50">Saldo pendiente: {formatMonto(saldo)}</p>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${accion === 'PENDIENTE' ? 'border-red-400 bg-red-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <input type="radio" name="accion_parcial" value="PENDIENTE" checked={accion === 'PENDIENTE'} onChange={() => setAccion('PENDIENTE')} className="accent-red-600" />
                  <div>
                    <span className="text-sm font-semibold text-primary-800">Revertir a Pendiente</span>
                    <p className="text-xs text-primary-800/50">Eliminar todos los pagos registrados</p>
                  </div>
                </label>
              </div>

              {accion === 'NUEVO_PAGO' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Monto del pago (S/.)</label>
                    <input type="number" step="0.01" min="0" max={saldo} value={montoPago} onChange={(e) => setMontoPago(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" placeholder={`Max: ${saldo.toFixed(2)}`} />
                  </div>
                  {montoPago && (
                    <p className="text-xs font-medium text-emerald-700">
                      {parseFloat(montoPago) >= saldo
                        ? 'Este pago completará el total — se marcará como Pagado'
                        : `Saldo restante: ${formatMonto(saldo - parseFloat(montoPago))}`}
                    </p>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Observación (opcional)</label>
                    <input type="text" value={observacion} onChange={(e) => setObservacion(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado PAGADO: solo ver, opcion revertir */}
          {detalle?.estado === 'PAGADO' && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${accion === 'PENDIENTE' ? 'border-red-400 bg-red-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <input type="radio" name="accion_pagado" value="PENDIENTE" checked={accion === 'PENDIENTE'} onChange={() => setAccion('PENDIENTE')} className="accent-red-600" />
                  <div>
                    <span className="text-sm font-semibold text-primary-800">Revertir a Pendiente</span>
                    <p className="text-xs text-primary-800/50">Eliminar todos los pagos y regresar a pendiente</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-3 border-t border-cream-200">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-primary-800/60 hover:text-primary-800 rounded-lg hover:bg-cream-100 transition-colors">
              Cancelar
            </button>
            {accion && (
              <button
                onClick={handleGuardar}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default Pensiones;

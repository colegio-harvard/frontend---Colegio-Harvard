import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLES, API_URL } from '../utils/constants';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { obtenerPlantilla, obtenerEstadoPension, cuadriculaPensiones, registrarPago, obtenerDetalleMes, obtenerTicketPension, exportarDeudoresPensionesExcel } from '../services/pensionesService';
import { listarNiveles, listarGrados, listarAulas } from '../services/configEscolarService';
import { HiCheck, HiX, HiMinus, HiSearch, HiClock, HiChevronLeft, HiChevronRight, HiPrinter, HiDownload, HiChatAlt2, HiDeviceMobile, HiExternalLink } from 'react-icons/hi';
import { formatFecha } from '../utils/formatters';
import toast from 'react-hot-toast';

const nombreMes = (p) => p.nombre || p.clave;

const formatMonto = (n) => `S/. ${Number(n || 0).toFixed(2)}`;

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const ticketHtml = (ticket) => {
  const pension = ticket?.pension || {};
  const alumno = ticket?.alumno || {};
  const registradoPor = ticket?.registrado_por || {};
  const verifyUrl = `${API_URL}/pensiones/ticket/${encodeURIComponent(ticket.codigo || '')}`;
  const filas = [
    ['Codigo', ticket.codigo],
    ['Fecha de pago', ticket.fecha_pago],
    ['Alumno', alumno.nombre_completo],
    ['Codigo alumno', alumno.codigo_alumno],
    ['DNI', alumno.dni || '-'],
    ['Aula', alumno.aula || '-'],
    ['Concepto', pension.concepto],
    ['Estado', pension.estado],
    ['Monto de este pago', formatMonto(pension.monto_pagado_en_ticket)],
    ['Monto total', formatMonto(pension.monto_total)],
    ['Pagado acumulado', formatMonto(pension.monto_pagado_acumulado)],
    ['Saldo pendiente', formatMonto(pension.saldo_pendiente)],
    ['Registrado por', registradoPor.nombre],
    ['Observacion', ticket.observacion || '-'],
  ];

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Ticket ${escapeHtml(ticket.codigo)}</title>
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #321818; font-family: Arial, sans-serif; background: #fff; }
        .sheet { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 138mm; gap: 4mm; }
        .ticket { border: 1px dashed #bda46c; border-radius: 4px; padding: 3mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
        .ticket-inner { height: 100%; border: 1px solid #e6d9bd; border-radius: 4px; padding: 4mm; }
        .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; border-bottom: 1px solid #eadfca; padding-bottom: 5px; margin-bottom: 5px; }
        h1 { margin: 0; font-size: 15px; color: #8b1d1d; }
        h2 { margin: 1px 0 0; font-size: 10px; color: #a67a00; font-weight: 500; }
        .code { border: 1px dashed #b08a19; padding: 4px 6px; font-size: 13px; font-weight: 700; letter-spacing: .5px; white-space: nowrap; }
        table { width: 100%; border-collapse: collapse; font-size: 9.2px; line-height: 1.15; }
        td { border-bottom: 1px solid #f0e6d8; padding: 2.8px 0; vertical-align: top; }
        td:first-child { width: 34%; color: #9a7a19; font-weight: 700; padding-right: 4px; }
        .verify { margin-top: 5px; font-size: 7.5px; color: #6b5b43; overflow-wrap: anywhere; }
        @media screen {
          body { background: #f7f0e6; padding: 16px; }
          .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 8mm; box-shadow: 0 3px 16px rgba(0,0,0,.12); }
        }
        @media print { body { background: #fff; } }
      </style>
    </head>
    <body>
      <main class="sheet">
        <section class="ticket">
          <div class="ticket-inner">
            <div class="head">
              <div><h1>Colegio Harvard</h1><h2>Recibo de pago</h2></div>
              <div class="code">${escapeHtml(ticket.codigo)}</div>
            </div>
            <table>
              ${filas.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}
            </table>
            <div class="verify"><strong>Verificacion:</strong> ${escapeHtml(verifyUrl)}</div>
          </div>
        </section>
      </main>
      <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
    </body>
  </html>`;
};

const imprimirTicket = (ticket) => {
  if (!ticket?.codigo) return;
  const win = window.open('', '_blank', 'width=430,height=720');
  if (!win) {
    toast.error('Permita ventanas emergentes para imprimir el ticket');
    return;
  }
  win.document.open();
  win.document.write(ticketHtml(ticket));
  win.document.close();
};

const urlRecibo = (ticket) => `${window.location.origin}/recibo/${encodeURIComponent(ticket?.codigo || '')}`;

const mensajeReciboWhatsApp = (ticket) => {
  const alumno = ticket?.alumno || {};
  const pension = ticket?.pension || {};
  return `*COLEGIO HARVARD – RECIBO DE PAGO*\n\nEstimado(a) apoderado(a), confirmamos el pago registrado a nombre de *${alumno.nombre_completo || 'su menor hijo(a)'}*.\n\n*Recibo:* ${ticket?.codigo || '-'}\n*Concepto:* ${pension.concepto || '-'}\n*Fecha:* ${ticket?.fecha_pago || '-'}\n*Monto recibido:* ${formatMonto(pension.monto_pagado_en_ticket)}\n*Total del concepto:* ${formatMonto(pension.monto_total)}\n*Acumulado pagado:* ${formatMonto(pension.monto_pagado_acumulado)}\n*Saldo pendiente:* ${formatMonto(pension.saldo_pendiente)}\n\nPuede consultar o imprimir el recibo completo aquí:\n${urlRecibo(ticket)}\n\nGracias por su pago.\n*COLEGIO HARVARD*`;
};

const mensajeReciboSms = (ticket) => {
  const alumno = ticket?.alumno || {};
  const pension = ticket?.pension || {};
  return `COLEGIO HARVARD: Pago registrado de ${formatMonto(pension.monto_pagado_en_ticket)} por ${pension.concepto || 'pensión'} de ${alumno.nombre_completo || 'alumno(a)'}. Recibo ${ticket?.codigo || '-'}. Acumulado ${formatMonto(pension.monto_pagado_acumulado)}. Saldo ${formatMonto(pension.saldo_pendiente)}. Gracias.`;
};

const telefonoRecibo = (ticket) => String(ticket?.apoderado?.celular || '').replace(/\D/g, '');

const ConfirmacionRecibo = ({ ticket, onClose }) => {
  if (!ticket) return null;
  const pension = ticket.pension || {};
  const telefono = telefonoRecibo(ticket);
  const abrirWhatsApp = () => {
    if (!telefono) return toast.error('El apoderado no tiene un celular registrado');
    window.location.href = `whatsapp://send?phone=${encodeURIComponent(telefono)}&text=${encodeURIComponent(mensajeReciboWhatsApp(ticket))}`;
  };
  const abrirSms = () => {
    if (!telefono) return toast.error('El apoderado no tiene un celular registrado');
    window.location.href = `sms:${telefono}?body=${encodeURIComponent(mensajeReciboSms(ticket))}`;
  };
  return <Modal isOpen={true} onClose={onClose} title="Pago registrado correctamente" size="lg">
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-emerald-800"><HiCheck className="h-6 w-6" /><p className="text-lg font-bold">Recibo {ticket.codigo}</p></div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><div><p className="text-gray-500">Alumno</p><p className="font-semibold">{ticket.alumno?.nombre_completo}</p></div><div><p className="text-gray-500">Monto recibido</p><p className="font-semibold">{formatMonto(pension.monto_pagado_en_ticket)}</p></div><div><p className="text-gray-500">Acumulado</p><p className="font-semibold">{formatMonto(pension.monto_pagado_acumulado)}</p></div><div><p className="text-gray-500">Saldo</p><p className="font-semibold">{formatMonto(pension.saldo_pendiente)}</p></div></div>
      </div>
      <div className="rounded-xl border border-cream-200 bg-cream-50 p-4"><p className="mb-2 text-xs font-semibold uppercase text-gold-700">Mensaje preparado</p><pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{mensajeReciboWhatsApp(ticket)}</pre></div>
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={abrirWhatsApp} className="btn-primary flex items-center justify-center gap-2"><HiChatAlt2 /> Enviar por WhatsApp</button><button type="button" onClick={abrirSms} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 font-semibold text-blue-800 hover:bg-blue-100"><HiDeviceMobile /> Enviar por SMS</button><button type="button" onClick={() => imprimirTicket(ticket)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-300 bg-white px-4 py-2.5 font-semibold text-primary-800 hover:bg-primary-50"><HiPrinter /> Imprimir / guardar PDF</button><button type="button" onClick={() => window.open(urlRecibo(ticket), '_blank', 'noopener,noreferrer')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-300 bg-white px-4 py-2.5 font-semibold text-primary-800 hover:bg-primary-50"><HiExternalLink /> Ver recibo digital</button></div>
      <div className="flex justify-end"><button type="button" onClick={onClose} className="btn-secondary">Cerrar</button></div>
    </div>
  </Modal>;
};

// ============================
// Badge de estado reutilizable
// ============================
const EstadoBadge = ({ estado }) => {
  if (estado === 'PAGADO') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><HiCheck className="w-3 h-3" /> Pagado</span>;
  if (estado === 'PAGO_PARCIAL') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><HiClock className="w-3 h-3" /> Parcial</span>;
  if (estado === 'NO_CORRESPONDE') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700"><HiMinus className="w-3 h-3" /> No corresponde</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600"><HiX className="w-3 h-3" /> Pendiente</span>;
};

const Pensiones = () => {
  const { usuario } = useAuth();
  if (usuario?.rol_codigo === ROLES.PADRE) return <PensionPadre />;
  return <PensionAdmin />;
};

// ============================================================
// VISTA PADRE - Tabs por hijo + cards grandes + 3 estados
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
                  NO_CORRESPONDE: 'border-sky-300 bg-sky-50',
                  PENDIENTE: 'border-red-200 bg-red-50/50',
                };
                const iconStyles = {
                  PAGADO: 'text-emerald-600',
                  PAGO_PARCIAL: 'text-amber-600',
                  NO_CORRESPONDE: 'text-sky-600',
                  PENDIENTE: 'text-red-400',
                };
                const labelStyles = {
                  PAGADO: 'text-emerald-700',
                  PAGO_PARCIAL: 'text-amber-700',
                  NO_CORRESPONDE: 'text-sky-700',
                  PENDIENTE: 'text-red-500',
                };
                const labels = {
                  PAGADO: 'Pagado',
                  PAGO_PARCIAL: 'Pago Parcial',
                  NO_CORRESPONDE: 'No corresponde',
                  PENDIENTE: 'Pendiente',
                };
                const IconComp = estado === 'PAGADO' ? HiCheck : estado === 'PAGO_PARCIAL' ? HiClock : estado === 'NO_CORRESPONDE' ? HiMinus : HiX;

                return (
                  <div key={mes.clave} className={`flex flex-col items-center p-6 rounded-xl border-2 ${cardStyles[estado]}`}>
                    <span className="text-base font-semibold text-primary-800">{nombreMes(mes)}</span>

                    {/* Comentario de la plantilla (del superadmin) - debajo del mes */}
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

                    {/* Observacion del pago - debajo de la info de pago */}
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
// VISTA ADMIN - Cuadricula + Modal de pago
// ============================================================
const PensionAdmin = () => {
  const [cuadricula, setCuadricula] = useState([]);
  const [plantilla, setPlantilla] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtros, setFiltros] = useState({ id_nivel: '', id_grado: '', id_aula: '' });
  const [busqueda, setBusqueda] = useState('');
  const [ticketBusqueda, setTicketBusqueda] = useState('');
  const [conceptoDeudores, setConceptoDeudores] = useState('');
  const [descargandoDeudores, setDescargandoDeudores] = useState(false);
  const [niveles, setNiveles] = useState([]);
  const [grados, setGrados] = useState([]);
  const [aulasDisponibles, setAulasDisponibles] = useState([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAlumno, setModalAlumno] = useState(null);
  const [modalMes, setModalMes] = useState(null);
  const [ticketConfirmacion, setTicketConfirmacion] = useState(null);

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

  const handleBuscarTicket = async () => {
    const codigo = ticketBusqueda.trim().toUpperCase();
    if (!codigo) return toast.error('Ingrese el código del ticket');
    try {
      const { data } = await obtenerTicketPension(codigo);
      imprimirTicket(data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ticket no encontrado');
    }
  };

  const handleExportarDeudores = async () => {
    if (!conceptoDeudores) return toast.error('Seleccione el concepto de cobro');
    const loadingToast = toast.loading('Preparando lista de deudores...');
    try {
      setDescargandoDeudores(true);
      const params = { concepto: conceptoDeudores };
      if (filtros.id_nivel) params.id_nivel = filtros.id_nivel;
      if (filtros.id_grado) params.id_grado = filtros.id_grado;
      if (filtros.id_aula) params.id_aula = filtros.id_aula;
      const res = await exportarDeudoresPensionesExcel(params);
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/i);
      link.href = url;
      link.download = match?.[1] || `deudores-${conceptoDeudores}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Lista de deudores descargada', { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo descargar la lista', { id: loadingToast });
    } finally {
      setDescargandoDeudores(false);
    }
  };
  const handlePagoRegistrado = (ticket) => {
    cerrarModal();
    if (ticket?.codigo) setTicketConfirmacion(ticket);
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

  // Paginación
  const ROWS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(cuadriculaFiltrada.length / ROWS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return cuadriculaFiltrada.slice(start, start + ROWS_PER_PAGE);
  }, [cuadriculaFiltrada, currentPage]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [cuadriculaFiltrada.length]);

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
                  placeholder="Nombre, DNI, codigo..."
                  className="pl-9 pr-3 py-2 border border-cream-300 rounded-lg outline-none text-sm bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gold-600 mb-1">Buscar ticket</label>
              <div className="relative">
                <HiPrinter className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-800/30 w-4 h-4" />
                <input
                  type="text"
                  value={ticketBusqueda}
                  onChange={(e) => setTicketBusqueda(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarTicket()}
                  placeholder="Ej: R8F3A2C"
                  className="pl-9 pr-3 py-2 border border-cream-300 rounded-lg outline-none text-sm w-full uppercase"
                />
              </div>
            </div>

            <button
              onClick={handleBuscarTicket}
              className="self-end px-5 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg text-sm font-medium"
            >
              Ticket
            </button>

            <div>
              <label className="block text-xs font-medium text-gold-600 mb-1">Concepto de deuda</label>
              <select
                value={conceptoDeudores}
                onChange={(e) => setConceptoDeudores(e.target.value)}
                className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm bg-white"
              >
                <option value="">Seleccione...</option>
                {plantilla.map(p => <option key={p.clave} value={p.clave}>{nombreMes(p)}</option>)}
              </select>
            </div>

            <button
              onClick={handleExportarDeudores}
              disabled={descargandoDeudores}
              className="self-end inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm text-sm font-medium"
            >
              <HiDownload className="w-4 h-4" />
              {descargandoDeudores ? 'Preparando...' : 'Lista deudores'}
            </button>
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
                <th className="sticky left-0 z-20 bg-cream-50 px-3 py-2 text-left text-xs font-medium text-gold-600 uppercase">Alumno</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gold-600 uppercase">DNI alumno</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gold-600 uppercase">Padre/Apoderado</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gold-600 uppercase">Aula</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gold-600 uppercase">Matrícula</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gold-600 uppercase">Materiales</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gold-600 uppercase">Pensión</th>
                {plantilla.map(p => (
                  <th key={p.clave} className="px-3 py-2 text-center text-xs font-medium text-gold-600 uppercase">{nombreMes(p)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(alumno => (
                <tr key={alumno.id} className="group border-t hover:bg-cream-50">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 whitespace-nowrap group-hover:bg-cream-50">
                    <div className="text-sm font-medium text-primary-800">{alumno.nombre_completo}</div>
                    <div className="text-xs text-gold-600">{alumno.codigo_alumno}</div>
                  </td>
                  <td className="px-3 py-2 text-sm text-primary-800/70">{alumno.dni || '-'}</td>
                  <td className="px-3 py-2 text-sm text-primary-800/70 whitespace-nowrap">
                    {alumno.padre ? <><div>{alumno.padre.nombre_completo}</div>{alumno.padre.celular ? <a href={`tel:${String(alumno.padre.celular).replace(/\s/g, '')}`} className="text-xs font-medium text-gold-600 hover:text-gold-700 hover:underline">{alumno.padre.celular}</a> : <div className="text-xs italic text-cream-400">Celular no registrado</div>}</> : <span className="text-cream-400 italic">Sin vincular</span>}
                  </td>
                  <td className="px-3 py-2 text-sm text-primary-800/70 whitespace-nowrap">
                    {alumno.aula ? `${alumno.aula.grado?.nombre || ''} ${alumno.aula.seccion}` : '-'}
                  </td>
                                    <td className="px-3 py-2 text-sm text-primary-800/70 text-right whitespace-nowrap">
                    {alumno.monto_matricula != null ? formatMonto(alumno.monto_matricula) : <span className="text-cream-400 italic">-</span>}
                  </td>
                  <td className="px-3 py-2 text-sm text-primary-800/70 text-right whitespace-nowrap">
                    {alumno.monto_materiales != null ? formatMonto(alumno.monto_materiales) : <span className="text-cream-400 italic">-</span>}
                  </td>
                  <td className="px-3 py-2 text-sm text-primary-800/70 text-right whitespace-nowrap">
                    {alumno.monto_pension != null ? formatMonto(alumno.monto_pension) : <span className="text-cream-400 italic">-</span>}
                  </td>
                  {plantilla.map(p => {
                    const est = alumno.pensiones?.find(e => e.clave_mes === p.clave);
                    const estado = est?.estado || 'PENDIENTE';

                    const btnColors = {
                      PAGADO: 'bg-emerald-500 text-white hover:bg-emerald-600',
                      PAGO_PARCIAL: 'bg-amber-400 text-white hover:bg-amber-500',
                      NO_CORRESPONDE: 'bg-sky-200 text-sky-700 hover:bg-sky-300',
                      PENDIENTE: 'bg-cream-200 text-cream-400 hover:bg-cream-300',
                    };
                    const IconComp = estado === 'PAGADO' ? HiCheck : estado === 'PAGO_PARCIAL' ? HiClock : estado === 'NO_CORRESPONDE' ? HiMinus : HiX;

                    return (
                      <td key={p.clave} className="px-3 py-2 text-center">
                        <button
                          onClick={() => abrirModal(alumno, p)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${btnColors[estado]}`}
                          title={estado === 'PAGO_PARCIAL' && est
                            ? `Pagado: ${formatMonto(est.monto_pagado)} · Saldo: ${formatMonto(Math.max(0, Number(est.monto_total || 0) - Number(est.monto_pagado || 0)))}`
                            : estado}
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-cream-200 bg-cream-50/50">
            <span className="text-sm text-primary-800/60">
              Mostrando {((currentPage - 1) * ROWS_PER_PAGE) + 1}-{Math.min(currentPage * ROWS_PER_PAGE, cuadriculaFiltrada.length)} de {cuadriculaFiltrada.length} registros
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-primary-800/60 hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <HiChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .reduce((acc, page, idx, arr) => {
                  if (idx > 0 && page - arr[idx - 1] > 1) acc.push('...');
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '...' ? (
                    <span key={`dots-${idx}`} className="px-1 text-sm text-primary-800/40">...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === item
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-primary-800/60 hover:bg-cream-200'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-primary-800/60 hover:bg-cream-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <HiChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
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
      <ConfirmacionRecibo ticket={ticketConfirmacion} onClose={() => setTicketConfirmacion(null)} />
    </div>
  );
};

// ============================================================
// MODAL DE PAGO - Admin registra pagos
// ============================================================
export const ModalPago = ({ alumno, mes, onClose, onSaved }) => {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulario
  const [accion, setAccion] = useState(''); // 'PAGADO', 'PAGO_PARCIAL', 'PENDIENTE', 'NUEVO_PAGO'
  const [montoTotal, setMontoTotal] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [observacion, setObservacion] = useState('');

  const conceptoPago = () => String((mes?.clave || '') + ' ' + (mes?.nombre || ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const montoTotalSugerido = () => {
    const clave = conceptoPago();
    const montoPersonalizado = Number(mes?.monto);
    const monto = Number.isFinite(montoPersonalizado) && montoPersonalizado > 0
      ? montoPersonalizado
      : clave.includes('MATRICULA')
      ? alumno?.monto_matricula
      : clave.includes('MATERIAL')
        ? alumno?.monto_materiales
        : alumno?.monto_pension;

    const numero = Number(monto);
    return Number.isFinite(numero) && numero > 0 ? numero.toFixed(2) : '';
  };

  const etiquetaMontoConcepto = () => {
    const clave = conceptoPago();
    if (clave.includes('MATRICULA')) return 'MatrÃ­cula';
    if (clave.includes('MATERIAL')) return 'Materiales';
    return mes?.nombre || 'PensiÃ³n';
  };

  const completarMontoTotal = () => {
    setMontoTotal((actual) => actual || String(detalle?.monto_total || montoTotalSugerido()));
  };

  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        const res = await obtenerDetalleMes(alumno.id, mes.clave);
        const d = res.data.data;
        setDetalle(d);
        setMontoTotal(String(d.monto_total || montoTotalSugerido()));

        // Pre-seleccionar accion según estado actual
        if (d.estado === 'PAGO_PARCIAL') {
          setAccion('NUEVO_PAGO');
          setMontoTotal(String(d.monto_total || montoTotalSugerido()));
        } else if (d.estado === 'NO_CORRESPONDE') {
          setAccion('');
          setObservacion(d.observacion_no_corresponde || '');
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

  const reimprimirTicket = async (codigo) => {
    try {
      const { data } = await obtenerTicketPension(codigo);
      imprimirTicket(data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo abrir el ticket');
    }
  };

  const handleGuardar = async () => {
    if (!accion) return;

    // Validaciones
    if (accion === 'PAGADO') {
      if (!montoTotal || parseFloat(montoTotal) <= 0) {
        return toast.error('Ingrese el monto total');
      }
    } else if (accion === 'PAGO_PARCIAL') {
      if (!montoTotal || parseFloat(montoTotal) <= 0) return toast.error('Ingrese el monto total');
      if (montoPago === '' || parseFloat(montoPago) < 0) return toast.error('Ingrese el monto del pago');
      if (parseFloat(montoPago) >= parseFloat(montoTotal)) return toast.error('El monto del pago debe ser menor al total. Para pago completo, use "Pago Completo".');
    } else if (accion === 'NUEVO_PAGO') {
      if (montoPago === '' || parseFloat(montoPago) < 0) return toast.error('Ingrese el monto del pago');
    } else if (accion === 'NO_CORRESPONDE') {
      if (!observacion.trim()) return toast.error('Ingrese la observación');
    }

    setSaving(true);
    try {
      let res = null;
      if (accion === 'PAGADO') {
        res = await registrarPago({
          id_alumno: alumno.id,
          clave_mes: mes.clave,
          estado: 'PAGADO',
          monto_total: parseFloat(montoTotal),
          observacion: observacion || undefined,
        });
      } else if (accion === 'PAGO_PARCIAL') {
        res = await registrarPago({
          id_alumno: alumno.id,
          clave_mes: mes.clave,
          estado: 'PAGO_PARCIAL',
          monto_total: parseFloat(montoTotal),
          monto_pago: parseFloat(montoPago),
          observacion: observacion || undefined,
        });
      } else if (accion === 'NUEVO_PAGO') {
        res = await registrarPago({
          id_alumno: alumno.id,
          clave_mes: mes.clave,
          estado: 'PAGO_PARCIAL',
          monto_total: detalle.monto_total,
          monto_pago: parseFloat(montoPago),
          observacion: observacion || undefined,
        });
      } else if (accion === 'NO_CORRESPONDE') {
        res = await registrarPago({
          id_alumno: alumno.id,
          clave_mes: mes.clave,
          estado: 'NO_CORRESPONDE',
          observacion: observacion.trim(),
        });
      } else if (accion === 'PENDIENTE') {
        res = await registrarPago({
          id_alumno: alumno.id,
          clave_mes: mes.clave,
          estado: 'PENDIENTE',
        });
      }

      const ticket = res?.data?.data?.ticket;
      toast.success(ticket?.codigo ? `Pension actualizada - Ticket ${ticket.codigo}` : 'Pension actualizada');
      onSaved(ticket || null);
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
                            <p className="text-xs text-primary-800/60">
                {alumno.codigo_alumno} {alumno.aula ? `| ${alumno.aula.grado?.nombre || ''} ${alumno.aula.seccion}` : ''}
                {detalle?.monto_total != null ? ` | ${nombreMes(mes)}: ${formatMonto(detalle.monto_total)}` : ''}
              </p>
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
                      <th className="px-3 py-2 text-right text-xs font-medium text-gold-600">Ticket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.pagos.map((p, idx) => (
                      <tr key={idx} className="border-t border-cream-100">
                        <td className="px-3 py-2 text-primary-800/80">{formatFecha(p.fecha)}</td>
                        <td className="px-3 py-2 text-right font-medium text-primary-800">{formatMonto(p.monto)}</td>
                        <td className="px-3 py-2 text-primary-800/60">{p.observacion || '-'}</td>
                        <td className="px-3 py-2 text-right">
                          {p.codigo_ticket ? (
                            <button
                              type="button"
                              onClick={() => reimprimirTicket(p.codigo_ticket)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cream-100 text-primary-800 hover:bg-cream-200 text-xs font-semibold"
                              title={`Reimprimir ${p.codigo_ticket}`}
                            >
                              <HiPrinter className="w-3 h-3" /> {p.codigo_ticket}
                            </button>
                          ) : (
                            <span className="text-xs text-primary-800/30">-</span>
                          )}
                        </td>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${accion === 'PAGADO' ? 'border-emerald-400 bg-emerald-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <input type="radio" name="accion" value="PAGADO" checked={accion === 'PAGADO'} onChange={() => { setAccion('PAGADO'); setMontoPago(''); completarMontoTotal(); }} className="accent-emerald-600" />
                  <div>
                    <span className="text-sm font-semibold text-primary-800">Pago Completo</span>
                    <p className="text-xs text-primary-800/50">Marcar como pagado en su totalidad</p>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${accion === 'PAGO_PARCIAL' ? 'border-amber-400 bg-amber-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <input type="radio" name="accion" value="PAGO_PARCIAL" checked={accion === 'PAGO_PARCIAL'} onChange={() => { setAccion('PAGO_PARCIAL'); completarMontoTotal(); }} className="accent-amber-600" />
                  <div>
                    <span className="text-sm font-semibold text-primary-800">Pago Parcial</span>
                    <p className="text-xs text-primary-800/50">Registrar un pago parcial</p>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${accion === 'NO_CORRESPONDE' ? 'border-sky-400 bg-sky-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <input type="radio" name="accion" value="NO_CORRESPONDE" checked={accion === 'NO_CORRESPONDE'} onChange={() => { setAccion('NO_CORRESPONDE'); setMontoPago(''); setMontoTotal(''); }} className="accent-sky-600" />
                  <div>
                    <span className="text-sm font-semibold text-primary-800">No Corresponde Pago</span>
                    <p className="text-xs text-primary-800/50">Registrar que este mes no aplica</p>
                  </div>
                </label>
              </div>

              {/* Campos para pago completo */}
              {accion === 'PAGADO' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Monto Total (S/.)</label>
                    <input type="text" inputMode="decimal" value={montoTotal} readOnly
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm bg-cream-50" />
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
                    <label className="block text-xs font-medium text-gold-600 mb-1">Monto total del concepto (S/.)</label>
                    <input type="text" inputMode="decimal" value={montoTotal} readOnly
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm bg-cream-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Monto de este pago (S/.)</label>
                    <input type="text" inputMode="decimal" value={montoPago} onChange={(e) => setMontoPago(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" placeholder="Ej: 200.00" />
                  </div>
                  {montoTotal && montoPago !== '' && (
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
              {accion === 'NO_CORRESPONDE' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gold-600 mb-1">Observación (obligatoria)</label>
                    <input type="text" value={observacion} onChange={(e) => setObservacion(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" placeholder="Ej: Alumno ingreso en abril" />
                  </div>
                </div>
              )}
            </div>
          )}

          {detalle?.estado === 'NO_CORRESPONDE' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                <p className="text-sm font-semibold text-sky-800">No corresponde pago</p>
                <p className="text-xs text-sky-700 mt-1">{detalle.observacion_no_corresponde || 'Sin observación registrada'}</p>
              </div>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${accion === 'PENDIENTE' ? 'border-red-400 bg-red-50' : 'border-cream-200 hover:border-cream-300'}`}>
                  <input type="radio" name="accion_no_corresponde" value="PENDIENTE" checked={accion === 'PENDIENTE'} onChange={() => setAccion('PENDIENTE')} className="accent-red-600" />
                  <div>
                    <span className="text-sm font-semibold text-primary-800">Revertir a Pendiente</span>
                    <p className="text-xs text-primary-800/50">Volver a marcar este mes como pendiente</p>
                  </div>
                </label>
              </div>
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
                    <input type="text" inputMode="decimal" value={montoPago} onChange={(e) => setMontoPago(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" placeholder={`Max: ${saldo.toFixed(2)}`} />
                  </div>
                  {montoPago !== '' && (
                    <p className="text-xs font-medium text-emerald-700">
                      {parseFloat(montoPago) >= saldo
                        ? 'Este pago completará el total - se marcará como Pagado'
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









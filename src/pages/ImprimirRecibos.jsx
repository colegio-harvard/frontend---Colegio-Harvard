import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { listarTicketsPension } from '../services/pensionesService';
import { listarNiveles, listarGrados, listarAulas } from '../services/configEscolarService';
import { API_URL } from '../utils/constants';
import { HiPrinter, HiSearch, HiCheck, HiX } from 'react-icons/hi';

const today = () => new Date().toISOString().split('T')[0];
const formatMonto = (n) => `S/. ${Number(n || 0).toFixed(2)}`;
const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const ticketCardHtml = (ticket) => {
  const pension = ticket?.pension || {};
  const alumno = ticket?.alumno || {};
  const registradoPor = ticket?.registrado_por || {};
  const verifyUrl = `${API_URL}/pensiones/ticket/${encodeURIComponent(ticket.codigo || '')}`;
  const filas = [
    ['Codigo', ticket.codigo],
    ['Fecha', ticket.fecha_pago],
    ['Alumno', alumno.nombre_completo],
    ['Cod. alumno', alumno.codigo_alumno],
    ['DNI', alumno.dni || '-'],
    ['Aula', alumno.aula || '-'],
    ['Concepto', pension.concepto],
    ['Monto', formatMonto(pension.monto_pagado_en_ticket)],
    ['Total', formatMonto(pension.monto_total)],
    ['Acumulado', formatMonto(pension.monto_pagado_acumulado)],
    ['Saldo', formatMonto(pension.saldo_pendiente)],
    ['Registro', registradoPor.nombre],
    ['Obs.', ticket.observacion || '-'],
  ];

  return `
    <section class="ticket">
      <div class="ticket-inner">
        <div class="head">
          <div>
            <h1>Colegio Harvard</h1>
            <h2>Recibo de pago</h2>
          </div>
          <div class="code">${escapeHtml(ticket.codigo)}</div>
        </div>
        <table>
          ${filas.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}
        </table>
        <div class="verify"><strong>Verificacion:</strong> ${escapeHtml(verifyUrl)}</div>
      </div>
    </section>`;
};

const printSheetHtml = (tickets) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Recibos Colegio Harvard</title>
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #321818; font-family: Arial, sans-serif; background: #fff; }
      .sheet {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-auto-rows: 138mm;
        gap: 4mm;
        break-after: page;
        page-break-after: always;
      }
      .sheet:last-child { break-after: auto; page-break-after: auto; }
      .ticket {
        border: 1px dashed #bda46c;
        border-radius: 4px;
        padding: 3mm;
        overflow: hidden;
        break-inside: avoid;
        page-break-inside: avoid;
      }
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
        .sheet { width: 210mm; min-height: 297mm; margin: 0 auto 18px; background: #fff; padding: 8mm; box-shadow: 0 3px 16px rgba(0,0,0,.12); }
      }
      @media print {
        body { background: #fff; }
      }
    </style>
  </head>
  <body>
    ${Array.from({ length: Math.ceil(tickets.length / 4) }, (_, pageIndex) => {
      const group = tickets.slice(pageIndex * 4, pageIndex * 4 + 4);
      return `<main class="sheet">${group.map(ticketCardHtml).join('')}</main>`;
    }).join('')}
    <script>window.onload = () => setTimeout(() => window.print(), 350);</script>
  </body>
</html>`;

const ImprimirRecibos = () => {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [niveles, setNiveles] = useState([]);
  const [grados, setGrados] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [filtros, setFiltros] = useState({
    fecha_desde: today(),
    fecha_hasta: today(),
    buscar: '',
    id_nivel: '',
    id_grado: '',
    id_aula: '',
  });

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [nivelesR, gradosR, aulasR] = await Promise.all([listarNiveles(), listarGrados(), listarAulas()]);
        setNiveles(nivelesR.data.data || []);
        setGrados(gradosR.data.data || []);
        setAulas(aulasR.data.data || []);
      } catch {
        // No bloquear la vista si un filtro falla.
      }
    };
    loadFilters();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const { data } = await listarTicketsPension(params);
      setTickets(data.data || []);
      setSelected({});
    } catch {
      toast.error('Error al cargar recibos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const gradosFiltrados = useMemo(() => {
    if (!filtros.id_nivel) return grados;
    return grados.filter(g => g.nivel?.id === parseInt(filtros.id_nivel) || g.id_nivel === parseInt(filtros.id_nivel));
  }, [grados, filtros.id_nivel]);

  const aulasFiltradas = useMemo(() => {
    let filtered = aulas;
    if (filtros.id_nivel) filtered = filtered.filter(a => a.grado?.nivel?.id === parseInt(filtros.id_nivel));
    if (filtros.id_grado) filtered = filtered.filter(a => a.grado?.id === parseInt(filtros.id_grado) || a.id_grado === parseInt(filtros.id_grado));
    return filtered;
  }, [aulas, filtros.id_nivel, filtros.id_grado]);

  const seleccionados = useMemo(() => tickets.filter(t => selected[t.id_pago]), [tickets, selected]);
  const allSelected = tickets.length > 0 && tickets.every(t => selected[t.id_pago]);

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next = {};
    tickets.forEach(t => { next[t.id_pago] = true; });
    setSelected(next);
  };

  const imprimir = () => {
    if (seleccionados.length === 0) {
      toast.error('Seleccione al menos un recibo');
      return;
    }
    const win = window.open('', '_blank', 'width=900,height=760');
    if (!win) {
      toast.error('Permita ventanas emergentes para imprimir recibos');
      return;
    }
    win.document.open();
    win.document.write(printSheetHtml(seleccionados.map(t => t.ticket)));
    win.document.close();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Imprimir Recibos</h1>
          <p className="text-sm text-primary-800/60">Seleccione recibos y genere hojas A4 con 4 recibos por página.</p>
        </div>
        <button onClick={imprimir} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
          <HiPrinter className="h-5 w-5" /> Imprimir seleccionados ({seleccionados.length})
        </button>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-6 lg:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-gold-600">Desde</label>
            <input type="date" value={filtros.fecha_desde} onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })} className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gold-600">Hasta</label>
            <input type="date" value={filtros.fecha_hasta} onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })} className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gold-600">Nivel</label>
            <select value={filtros.id_nivel} onChange={(e) => setFiltros({ ...filtros, id_nivel: e.target.value, id_grado: '', id_aula: '' })} className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none">
              <option value="">Todos</option>
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gold-600">Grado</label>
            <select value={filtros.id_grado} onChange={(e) => setFiltros({ ...filtros, id_grado: e.target.value, id_aula: '' })} className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none">
              <option value="">Todos</option>
              {gradosFiltrados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gold-600">Aula</label>
            <select value={filtros.id_aula} onChange={(e) => setFiltros({ ...filtros, id_aula: e.target.value })} className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none">
              <option value="">Todas</option>
              {aulasFiltradas.map(a => <option key={a.id} value={a.id}>{a.grado?.nombre} {a.seccion}</option>)}
            </select>
          </div>
          <button onClick={fetchTickets} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            Filtrar
          </button>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gold-600">Buscar</label>
          <div className="relative max-w-xl">
            <HiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-400" />
            <input value={filtros.buscar} onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && fetchTickets()} placeholder="Alumno, DNI, código de alumno o ticket..." className="w-full rounded-lg border border-cream-300 bg-white py-2 pl-9 pr-3 text-sm outline-none" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-col gap-2 border-b border-cream-200 pb-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-primary-800/70">{tickets.length} recibo(s) encontrados</div>
          <button onClick={toggleAll} className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-800">
            {allSelected ? <HiX className="h-4 w-4" /> : <HiCheck className="h-4 w-4" />}
            {allSelected ? 'Quitar selección' : 'Seleccionar todos'}
          </button>
        </div>
        {tickets.length === 0 ? (
          <p className="py-10 text-center text-primary-800/50">No hay recibos para los filtros seleccionados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-cream-50">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gold-600">Sel.</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gold-600">Ticket</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gold-600">Fecha</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gold-600">Alumno</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gold-600">Aula</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gold-600">Concepto</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gold-600">Monto</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id_pago} className="border-t border-cream-100 hover:bg-cream-50">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={!!selected[t.id_pago]} onChange={(e) => setSelected({ ...selected, [t.id_pago]: e.target.checked })} className="h-4 w-4 accent-primary-600" />
                    </td>
                    <td className="px-3 py-2 font-mono text-sm font-semibold text-primary-800">{t.codigo}</td>
                    <td className="px-3 py-2 text-sm text-primary-800/70">{t.fecha_pago}</td>
                    <td className="px-3 py-2">
                      <div className="text-sm font-medium text-primary-800">{t.alumno?.nombre_completo}</div>
                      <div className="text-xs text-gold-600">{t.alumno?.codigo_alumno}</div>
                    </td>
                    <td className="px-3 py-2 text-sm text-primary-800/70">{t.alumno?.aula || '-'}</td>
                    <td className="px-3 py-2 text-sm text-primary-800/70">{t.concepto || '-'}</td>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-primary-800">{formatMonto(t.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ImprimirRecibos;
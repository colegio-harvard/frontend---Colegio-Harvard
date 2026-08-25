import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HiCheckCircle, HiPrinter } from 'react-icons/hi';
import { obtenerTicketPension } from '../services/pensionesService';

const dinero = (valor) => `S/. ${Number(valor || 0).toFixed(2)}`;

export default function ReciboPublico() {
  const { codigo } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    obtenerTicketPension(codigo)
      .then(({ data }) => setTicket(data.data))
      .catch(() => setError('No se encontró un recibo válido con este código.'));
  }, [codigo]);

  if (error) return <main className="flex min-h-screen items-center justify-center bg-cream-50 p-4"><div className="rounded-xl border border-red-200 bg-white p-8 text-center text-red-700 shadow-lg">{error}</div></main>;
  if (!ticket) return <main className="flex min-h-screen items-center justify-center bg-cream-50 text-primary-700">Consultando recibo…</main>;

  const pension = ticket.pension || {};
  const filas = [
    ['Código', ticket.codigo],
    ['Fecha', ticket.fecha_pago],
    ['Alumno', ticket.alumno?.nombre_completo],
    ['Código de alumno', ticket.alumno?.codigo_alumno],
    ['Aula', ticket.alumno?.aula || '-'],
    ['Concepto', pension.concepto],
    ['Monto recibido', dinero(pension.monto_pagado_en_ticket)],
    ['Total del concepto', dinero(pension.monto_total)],
    ['Acumulado pagado', dinero(pension.monto_pagado_acumulado)],
    ['Saldo pendiente', dinero(pension.saldo_pendiente)],
  ];

  return <main className="min-h-screen bg-cream-50 p-4 print:bg-white">
    <section className="mx-auto max-w-lg rounded-2xl border border-cream-300 bg-white p-6 shadow-gold-lg print:border-0 print:shadow-none">
      <div className="text-center"><h1 className="font-display text-2xl font-bold text-primary-800">Colegio Harvard</h1><p className="text-sm text-gold-700">Recibo digital de pago</p><div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800"><HiCheckCircle /> Recibo válido</div></div>
      <div className="my-5 rounded-lg border border-dashed border-gold-500 p-3 text-center font-mono text-xl font-bold text-primary-800">{ticket.codigo}</div>
      <dl className="divide-y divide-cream-200">{filas.map(([etiqueta, valor]) => <div key={etiqueta} className="grid grid-cols-[42%_1fr] gap-3 py-2 text-sm"><dt className="font-semibold text-gold-700">{etiqueta}</dt><dd className="text-primary-900">{valor || '-'}</dd></div>)}</dl>
      {ticket.observacion && <div className="mt-4 rounded-lg bg-cream-50 p-3 text-sm"><span className="font-semibold">Observación:</span> {ticket.observacion}</div>}
      <p className="mt-5 text-center text-xs text-gray-500">Este recibo fue generado por NEURIX. Su código permite verificar su autenticidad.</p>
      <button type="button" onClick={() => window.print()} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 print:hidden"><HiPrinter /> Imprimir o guardar como PDF</button>
    </section>
  </main>;
}


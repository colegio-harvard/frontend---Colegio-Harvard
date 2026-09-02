import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HiCheckCircle, HiDownload, HiPrinter } from 'react-icons/hi';
import { obtenerReciboInventario } from '../services/inventarioService';

const dinero = valor => `S/ ${Number(valor || 0).toFixed(2)}`;
const fecha = valor => new Date(valor).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });

export default function ReciboInventarioPublico() {
  const { codigo } = useParams();
  const [venta, setVenta] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { obtenerReciboInventario(codigo).then(({ data }) => setVenta(data.data)).catch(() => setError('No se encontró un recibo válido con este código.')); }, [codigo]);
  if (error) return <main className="flex min-h-screen items-center justify-center bg-cream-50 p-4"><div className="rounded-xl border border-red-200 bg-white p-8 text-center text-red-700 shadow-lg">{error}</div></main>;
  if (!venta) return <main className="flex min-h-screen items-center justify-center bg-cream-50 text-primary-700">Consultando recibo…</main>;
  const filas = [['Código',venta.codigo],['Fecha',fecha(venta.fecha)],['Comprador',venta.comprador_nombre||venta.alumno?.nombre_completo],['Alumno',venta.alumno?.nombre_completo||'Compra externa'],['Operación',venta.tipo],['Medio de pago',venta.medio_pago||'-'],['Estado',venta.estado_pago],['Total',dinero(venta.total)],['Monto pagado',dinero(venta.monto_pagado)],['Saldo',dinero(venta.saldo)]];
  return <main className="min-h-screen bg-cream-50 p-4 print:bg-white"><section className="mx-auto max-w-lg rounded-2xl border border-cream-300 bg-white p-6 shadow-gold-lg print:border-0 print:shadow-none"><div className="text-center"><h1 className="font-display text-2xl font-bold text-primary-800">Colegio Harvard</h1><p className="text-sm text-gold-700">Recibo digital de compra</p><div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800"><HiCheckCircle/> Recibo válido</div></div><div className="my-5 rounded-lg border border-dashed border-gold-500 p-3 text-center font-mono text-lg font-bold text-primary-800">{venta.codigo}</div><dl className="divide-y divide-cream-200">{filas.map(([k,v])=><div key={k} className="grid grid-cols-[42%_1fr] gap-3 py-2 text-sm"><dt className="font-semibold text-gold-700">{k}</dt><dd>{v||'-'}</dd></div>)}</dl><h2 className="mt-5 font-bold text-primary-800">Detalle</h2><div className="mt-2 divide-y rounded-lg border">{venta.items.map(item=><div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 p-3 text-sm"><div><b>{item.variante.producto.nombre}</b><small className="block">{item.variante.nombre} · {item.cantidad} unidad(es)</small></div><b>{dinero(item.subtotal)}</b></div>)}</div>{venta.observacion&&<p className="mt-4 rounded-lg bg-cream-50 p-3 text-sm"><b>Observación:</b> {venta.observacion}</p>}<p className="mt-5 text-center text-xs text-gray-500">Documento digital verificable emitido por el Colegio Harvard.</p><div className="mt-5 grid gap-2 sm:grid-cols-2 print:hidden"><button onClick={()=>window.print()} className="btn-primary"><HiPrinter className="inline"/> Imprimir</button><button onClick={()=>window.print()} className="rounded-lg border px-4 py-2.5 font-semibold"><HiDownload className="inline"/> Guardar como PDF</button></div></section></main>;
}

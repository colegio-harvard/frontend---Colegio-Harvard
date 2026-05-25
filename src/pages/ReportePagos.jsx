import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { cuadriculaPensiones, obtenerPlantilla, exportarReportePagosExcel } from '../services/pensionesService';
import { HiCheck, HiClock, HiCurrencyDollar, HiDownload, HiMinus, HiSearch, HiX } from 'react-icons/hi';

const formatMonto = (monto) => {
  if (monto === null || monto === undefined || monto === '') return '-';
  return `S/. ${Number(monto).toFixed(2)}`;
};

const texto = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const nombreMes = (mes) => mes?.nombre || mes?.label || mes?.clave || '';

const nivelOrden = (nivel) => {
  const n = texto(nivel);
  if (n.includes('inicial')) return 1;
  if (n.includes('primaria')) return 2;
  if (n.includes('secundaria')) return 3;
  return 9;
};

const gradoOrden = (nivel, grado) => {
  const n = texto(nivel);
  const g = texto(grado);
  if (n.includes('inicial')) {
    if (g.includes('4')) return 1;
    if (g.includes('5')) return 2;
    return 9;
  }
  if (g.includes('1')) return 1;
  if (g.includes('2')) return 2;
  if (g.includes('3')) return 3;
  if (g.includes('4')) return 4;
  if (g.includes('5')) return 5;
  if (g.includes('6')) return 6;
  return 9;
};

const estadoConfig = {
  PAGADO: {
    label: 'Pagado',
    Icon: HiCheck,
    dot: 'bg-emerald-500 text-white',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  PAGO_PARCIAL: {
    label: 'Parcial',
    Icon: HiClock,
    dot: 'bg-amber-400 text-white',
    badge: 'bg-amber-100 text-amber-700',
  },
  NO_CORRESPONDE: {
    label: 'No corresponde',
    Icon: HiMinus,
    dot: 'bg-sky-200 text-sky-700',
    badge: 'bg-sky-100 text-sky-700',
  },
  PENDIENTE: {
    label: 'Pendiente',
    Icon: HiX,
    dot: 'bg-cream-200 text-cream-400',
    badge: 'bg-cream-100 text-primary-800/60',
  },
};

const getEstado = (alumno, claveMes) => {
  const estado = alumno.pensiones?.find(p => p.clave_mes === claveMes);
  return estado || { estado: 'PENDIENTE', monto_total: alumno.monto_pension || null, monto_pagado: 0 };
};

const calcularResumen = (alumnos, plantilla) => {
  const resumen = {
    alumnos: alumnos.length,
    pagado: 0,
    parcial: 0,
    pendiente: 0,
    noCorresponde: 0,
    cobrado: 0,
    saldo: 0,
  };

  alumnos.forEach(alumno => {
    plantilla.forEach(mes => {
      const est = getEstado(alumno, mes.clave);
      const estado = est.estado || 'PENDIENTE';
      const total = Number(est.monto_total ?? alumno.monto_pension ?? 0);
      const pagado = Number(est.monto_pagado || 0);

      if (estado === 'PAGADO') resumen.pagado += 1;
      else if (estado === 'PAGO_PARCIAL') resumen.parcial += 1;
      else if (estado === 'NO_CORRESPONDE') resumen.noCorresponde += 1;
      else resumen.pendiente += 1;

      resumen.cobrado += pagado;
      if (estado === 'PENDIENTE' || estado === 'PAGO_PARCIAL') {
        resumen.saldo += Math.max(total - pagado, 0);
      }
    });
  });

  return resumen;
};

const EstadoPunto = ({ estadoMes, alumno }) => {
  const estado = estadoMes.estado || 'PENDIENTE';
  const config = estadoConfig[estado] || estadoConfig.PENDIENTE;
  const Icon = config.Icon;
  const total = estadoMes.monto_total ?? alumno.monto_pension;
  const pagado = estadoMes.monto_pagado || 0;
  const saldo = Math.max(Number(total || 0) - Number(pagado || 0), 0);
  const title = [
    config.label,
    total != null ? `Total: ${formatMonto(total)}` : null,
    `Pagado: ${formatMonto(pagado)}`,
    estado === 'PAGO_PARCIAL' || estado === 'PENDIENTE' ? `Saldo: ${formatMonto(saldo)}` : null,
    estado === 'NO_CORRESPONDE' && estadoMes.observacion_no_corresponde ? `Obs: ${estadoMes.observacion_no_corresponde}` : null,
  ].filter(Boolean).join(' | ');

  return (
    <span title={title} className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${config.dot}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
};

const ReportePagos = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [plantilla, setPlantilla] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cuadriculaR, plantillaR] = await Promise.all([
          cuadriculaPensiones({}),
          obtenerPlantilla(),
        ]);
        setAlumnos(cuadriculaR.data.data || []);
        setPlantilla(plantillaR.data.data || []);
      } catch {
        toast.error('Error al cargar reporte de pagos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const niveles = useMemo(() => {
    const map = new Map();
    alumnos.forEach(alumno => {
      const nivel = alumno.aula?.grado?.nivel || 'Sin nivel';
      if (!map.has(nivel)) map.set(nivel, nivel);
    });
    return Array.from(map.values()).sort((a, b) => nivelOrden(a) - nivelOrden(b) || a.localeCompare(b));
  }, [alumnos]);

  const alumnosFiltrados = useMemo(() => {
    const term = texto(busqueda);
    return alumnos.filter(alumno => {
      const aula = alumno.aula ? `${alumno.aula.grado?.nombre || ''} ${alumno.aula.seccion || ''}` : '';
      const nivel = alumno.aula?.grado?.nivel || '';
      const coincideBusqueda = !term || [
        alumno.nombre_completo,
        alumno.codigo_alumno,
        alumno.dni,
        alumno.padre?.nombre_completo,
        alumno.padre?.dni,
        aula,
      ].some(value => texto(value).includes(term));

      const coincideNivel = !nivelFiltro || nivel === nivelFiltro;
      const coincideEstado = !estadoFiltro || plantilla.some(mes => getEstado(alumno, mes.clave).estado === estadoFiltro);

      return coincideBusqueda && coincideNivel && coincideEstado;
    });
  }, [alumnos, busqueda, estadoFiltro, nivelFiltro, plantilla]);

  const grupos = useMemo(() => {
    const map = new Map();
    alumnosFiltrados.forEach(alumno => {
      const nivel = alumno.aula?.grado?.nivel || 'Sin nivel';
      const grado = alumno.aula?.grado?.nombre || 'Sin grado';
      const seccion = alumno.aula?.seccion || '';
      const key = `${nivel}|${grado}|${seccion}`;
      if (!map.has(key)) {
        map.set(key, { key, nivel, grado, seccion, alumnos: [] });
      }
      map.get(key).alumnos.push(alumno);
    });

    return Array.from(map.values()).sort((a, b) => {
      const nivelDiff = nivelOrden(a.nivel) - nivelOrden(b.nivel);
      if (nivelDiff) return nivelDiff;
      const gradoDiff = gradoOrden(a.nivel, a.grado) - gradoOrden(b.nivel, b.grado);
      if (gradoDiff) return gradoDiff;
      return a.seccion.localeCompare(b.seccion);
    }).map(grupo => ({
      ...grupo,
      alumnos: grupo.alumnos.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)),
      resumen: calcularResumen(grupo.alumnos, plantilla),
    }));
  }, [alumnosFiltrados, plantilla]);

  const resumenGeneral = useMemo(() => calcularResumen(alumnosFiltrados, plantilla), [alumnosFiltrados, plantilla]);


  const descargarBackupPagos = async () => {
    try {
      const res = await exportarReportePagosExcel();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-pagos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Backup de pagos descargado');
    } catch (err) {
      toast.error('No se pudo descargar el backup de pagos');
    }
  };
  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Reporte de Pagos</h1>
          <p className="text-sm text-primary-800/60">Ordenado por Inicial, Primaria y Secundaria.</p>
        </div>
        <button onClick={descargarBackupPagos} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
          <HiDownload className="h-4 w-4" /> Descargar Excel
        </button>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_220px] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-gold-600">Buscar alumno</label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, DNI, codigo, padre o aula..."
                className="w-full rounded-lg border border-cream-300 bg-white py-2 pl-9 pr-3 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gold-600">Nivel</label>
            <select value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)} className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none">
              <option value="">Todos los niveles</option>
              {niveles.map(nivel => <option key={nivel} value={nivel}>{nivel}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gold-600">Estado</label>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none">
              <option value="">Todos los estados</option>
              <option value="PAGADO">Pagado</option>
              <option value="PAGO_PARCIAL">Pago parcial</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="NO_CORRESPONDE">No corresponde</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Card className="text-center"><p className="text-xs text-primary-800/50">Alumnos</p><p className="text-xl font-bold text-primary-800">{resumenGeneral.alumnos}</p></Card>
        <Card className="text-center"><p className="text-xs text-emerald-600">Pagados</p><p className="text-xl font-bold text-emerald-700">{resumenGeneral.pagado}</p></Card>
        <Card className="text-center"><p className="text-xs text-amber-600">Parciales</p><p className="text-xl font-bold text-amber-700">{resumenGeneral.parcial}</p></Card>
        <Card className="text-center"><p className="text-xs text-primary-800/50">Pendientes</p><p className="text-xl font-bold text-primary-800/70">{resumenGeneral.pendiente}</p></Card>
        <Card className="text-center"><p className="text-xs text-sky-600">No corresponde</p><p className="text-xl font-bold text-sky-700">{resumenGeneral.noCorresponde}</p></Card>
        <Card className="text-center"><p className="text-xs text-gold-600">Cobrado</p><p className="text-lg font-bold text-primary-800">{formatMonto(resumenGeneral.cobrado)}</p></Card>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          {Object.entries(estadoConfig).map(([key, config]) => {
            const Icon = config.Icon;
            return (
              <span key={key} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${config.badge}`}>
                <Icon className="h-3 w-3" /> {config.label}
              </span>
            );
          })}
        </div>
      </Card>

      <div className="space-y-4">
        {grupos.length === 0 ? (
          <Card><p className="py-8 text-center text-primary-800/50">No se encontraron pagos para los filtros seleccionados.</p></Card>
        ) : grupos.map(grupo => (
          <Card key={grupo.key}>
            <div className="mb-3 flex flex-col gap-2 border-b border-cream-200 pb-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">{grupo.nivel}</p>
                <h2 className="font-display text-xl font-bold text-primary-800">{grupo.grado} {grupo.seccion}</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-cream-100 px-2 py-1 text-primary-800/70">{grupo.alumnos.length} alumnos</span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{grupo.resumen.pagado} pagados</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{grupo.resumen.parcial} parciales</span>
                <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">{grupo.resumen.noCorresponde} no corresponde</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-cream-50">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gold-600">Alumno</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gold-600">DNI</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gold-600">Pension</th>
                    {plantilla.map(mes => (
                      <th key={mes.clave} className="px-3 py-2 text-center text-xs font-medium uppercase text-gold-600">{nombreMes(mes)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupo.alumnos.map(alumno => (
                    <tr key={alumno.id} className="border-t border-cream-100 hover:bg-cream-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-primary-800">{alumno.nombre_completo}</div>
                        <div className="text-xs text-gold-600">{alumno.codigo_alumno}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-primary-800/70">{alumno.dni || '-'}</td>
                      <td className="px-3 py-2 text-right text-sm text-primary-800/70">{formatMonto(alumno.monto_pension)}</td>
                      {plantilla.map(mes => {
                        const estadoMes = getEstado(alumno, mes.clave);
                        return (
                          <td key={mes.clave} className="px-3 py-2 text-center">
                            <EstadoPunto estadoMes={estadoMes} alumno={alumno} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReportePagos;
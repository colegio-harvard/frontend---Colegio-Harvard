import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLES, ESTADO_ASISTENCIA_LABELS } from '../utils/constants';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { calendarioAlumno, obtenerHijosPadre, asistenciaHoy, obtenerAulasTutor, asistenciaGlobal, exportarExcelAsistencia, corregirAsistencia } from '../services/asistenciaService';
import { listarNiveles, listarGrados, listarAulas, listarAÃ±os as listarAnios, obtenerCalendario, actualizarDiaCalendario } from '../services/configEscolarService';
import { formatFecha, formatHora, todayLimaISO } from '../utils/formatters';
import { HiDownload, HiCalendar, HiViewGrid, HiViewList, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';

const Asistencia = () => {
  const { usuario } = useAuth();
  const rol = usuario?.rol_codigo;

  if (rol === ROLES.PADRE) return <AsistenciaPadre />;
  if (rol === ROLES.TUTOR) return <AsistenciaTutor />;
  return <AsistenciaAdmin />;
};

const AsistenciaPadre = () => {
  const [datos, setDatos] = useState([]);
  const [hijos, setHijos] = useState([]);
  const [hijoSeleccionado, setHijoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return parseInt(now.toLocaleString('en-US', { timeZone: 'America/Lima', month: 'numeric' }));
  });
  const [año, setAño] = useState(() => {
    const now = new Date();
    return parseInt(now.toLocaleString('en-US', { timeZone: 'America/Lima', year: 'numeric' }));
  });
  const [vista, setVista] = useState('calendario'); // 'calendario' | 'lista'
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  useEffect(() => {
    const fetchHijos = async () => {
      try {
        const { data } = await obtenerHijosPadre();
        const lista = data.data || [];
        setHijos(lista);
        if (lista.length > 0) setHijoSeleccionado(lista[0].id);
      } catch { /* silenciar */ }
    };
    fetchHijos();
  }, []);

  useEffect(() => {
    if (!hijoSeleccionado) return;
    const fetch = async () => {
      setLoading(true);
      setDiaSeleccionado(null);
      try {
        const { data } = await calendarioAlumno({ id_alumno: hijoSeleccionado, mes, anio: año });
        setDatos(data.data || []);
      } catch {
        setDatos([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [mes, año, hijoSeleccionado]);

  const estadoColor = (estado) => {
    const conf = ESTADO_ASISTENCIA_LABELS[estado];
    return conf ? conf.color : 'bg-cream-100 text-gold-600';
  };

  const estadoBadgeVariant = (estado) => {
    if (estado === 'PRESENTE') return 'success';
    if (estado === 'TARDE') return 'warning';
    if (estado === 'AUSENTE') return 'danger';
    return null;
  };

  // Filtrar solo dias reales con registro para la vista de lista
  const diasConRegistro = datos.filter(d => d.dia && d.estado);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Asistencia</h1>
        <div className="flex bg-cream-100 rounded-lg p-0.5">
          <button
            onClick={() => setVista('calendario')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === 'calendario' ? 'bg-white text-primary-800 shadow-sm' : 'text-gold-600 hover:text-primary-800'}`}
          >
            <HiViewGrid className="w-4 h-4" /> Calendario
          </button>
          <button
            onClick={() => setVista('lista')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === 'lista' ? 'bg-white text-primary-800 shadow-sm' : 'text-gold-600 hover:text-primary-800'}`}
          >
            <HiViewList className="w-4 h-4" /> Lista
          </button>
        </div>
      </div>

      {/* Selector de hijos */}
      {hijos.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {hijos.map(hijo => (
            <div
              key={hijo.id}
              onClick={() => setHijoSeleccionado(hijo.id)}
              className={`cursor-pointer p-3 rounded-lg border-2 transition-colors ${hijoSeleccionado === hijo.id ? 'border-gold-400 bg-gold-50' : 'border-cream-200 bg-white hover:border-cream-300'}`}
            >
              <p className="font-medium text-sm text-primary-800">{hijo.nombre_completo}</p>
              <p className="text-xs text-gold-600">
                {hijo.aula?.grado?.nombre} {hijo.aula?.seccion}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))} className="px-3 py-2 border border-cream-300 rounded-lg outline-none">
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('es-PE', { month: 'long' })}</option>)}
        </select>
        <input type="number" value={año} onChange={(e) => setAño(parseInt(e.target.value))} className="px-3 py-2 border border-cream-300 rounded-lg outline-none w-24" />
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {datos.length === 0 ? (
            <Card>
              <p className="text-center text-gold-600 py-8">No hay registros para este periodo</p>
            </Card>
          ) : vista === 'calendario' ? (
            /* -- Vista Calendario -- */
            <div className="space-y-4">
              <Card>
                <div className="grid grid-cols-7 gap-1">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="text-center text-sm font-semibold text-primary-700 py-2">{d}</div>
                  ))}
                  {datos.map((dia, i) => (
                    <div
                      key={i}
                      onClick={() => dia.dia && dia.estado && setDiaSeleccionado(diaSeleccionado?.dia === dia.dia ? null : dia)}
                      className={`text-center py-3 rounded text-sm transition-all ${dia.estado ? `${estadoColor(dia.estado)} font-semibold ${dia.estado ? 'cursor-pointer hover:ring-2 hover:ring-gold-300' : ''}` : dia.dia ? 'bg-cream-50 text-cream-500' : ''} ${diaSeleccionado?.dia === dia.dia ? 'ring-2 ring-primary-500 scale-105' : ''}`}
                    >
                      {dia.dia && <div className="font-semibold text-base">{dia.dia}</div>}
                      {dia.estado && <div className="text-xs font-medium">{dia.estado === 'NO_LECTIVO' ? 'E' : ESTADO_ASISTENCIA_LABELS[dia.estado]?.label?.charAt(0)}</div>}
                      {dia.salida_no_registrada && <div className="text-[10px] text-amber-700 font-medium">Sin salida</div>}
                    </div>
                  ))}
                </div>

                {/* Leyenda */}
                <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-cream-200">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></span>
                    <span className="text-primary-800 font-medium">Asistió</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></span>
                    <span className="text-primary-800 font-medium">Tardanza</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-4 h-4 rounded bg-red-100 border border-red-300"></span>
                    <span className="text-primary-800 font-medium">Faltó</span>
                  </div>
                </div>
              </Card>

              {/* Detalle del día seleccionado */}
              {diaSeleccionado && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-primary-800">
                      {formatFecha(diaSeleccionado.fecha)}
                    </h3>
                    <Badge variant={estadoBadgeVariant(diaSeleccionado.estado)}>
                      {diaSeleccionado.estado === 'NO_LECTIVO' ? 'Dia especial' : ESTADO_ASISTENCIA_LABELS[diaSeleccionado.estado]?.label}
                    </Badge>
                  </div>
                  {diaSeleccionado.estado === 'NO_LECTIVO' ? (
                    <div className="bg-sky-50 rounded-lg p-3 border border-sky-100">
                      <p className="text-xs text-sky-700 mb-1">Fecha especial</p>
                      <p className="text-base font-semibold text-sky-900">{diaSeleccionado.nota || 'Dia no lectivo'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-cream-50 rounded-lg p-3">
                        <p className="text-xs text-gold-600 mb-1">Entrada</p>
                        <p className="text-lg font-semibold text-primary-800">
                          {diaSeleccionado.hora_ingreso ? formatHora(diaSeleccionado.hora_ingreso) : '-'}
                        </p>
                        {diaSeleccionado.metodo_ingreso && (
                          <p className="text-xs text-gold-500 mt-0.5">Metodo: {diaSeleccionado.metodo_ingreso}</p>
                        )}
                      </div>
                      <div className="bg-cream-50 rounded-lg p-3">
                        <p className="text-xs text-gold-600 mb-1">Salida</p>
                        <p className={`text-lg font-semibold ${diaSeleccionado.salida_no_registrada ? 'text-amber-600' : 'text-primary-800'}`}>
                          {diaSeleccionado.salida_no_registrada
                            ? 'No registrada'
                            : diaSeleccionado.hora_salida ? formatHora(diaSeleccionado.hora_salida) : '-'}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          ) : (
            /* -- Vista Lista -- */
            <Card>
              {diasConRegistro.length === 0 ? (
                <p className="text-center text-gold-600 py-8">No hay registros para este periodo</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cream-200">
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-gold-600 uppercase">Fecha</th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-gold-600 uppercase">Estado</th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-gold-600 uppercase">Entrada</th>
                        <th className="text-left py-2.5 px-3 text-xs font-medium text-gold-600 uppercase">Salida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-100">
                      {diasConRegistro.map((dia, i) => (
                        <tr key={i} className="hover:bg-cream-50 transition-colors">
                          <td className="py-2.5 px-3 text-primary-800 font-medium">{formatFecha(dia.fecha)}</td>
                          <td className="py-2.5 px-3">
                            <Badge variant={estadoBadgeVariant(dia.estado)}>
                              {ESTADO_ASISTENCIA_LABELS[dia.estado]?.label}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-primary-800">
                            {dia.hora_ingreso ? formatHora(dia.hora_ingreso) : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            {dia.salida_no_registrada
                              ? <span className="text-amber-600 text-xs font-medium">No registrada</span>
                              : <span className="text-primary-800">{dia.hora_salida ? formatHora(dia.hora_salida) : '-'}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

const AsistenciaTutor = () => {
  const [datos, setDatos] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [aulaSeleccionada, setAulaSeleccionada] = useState('');
  const [loading, setLoading] = useState(true);

  // Estado para el modal de calendario
  const [calModal, setCalModal] = useState(false);
  const [calAlumno, setCalAlumno] = useState(null);
  const [calDatos, setCalDatos] = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calMes, setCalMes] = useState(() => {
    const now = new Date();
    return parseInt(now.toLocaleString('en-US', { timeZone: 'America/Lima', month: 'numeric' }));
  });
  const [calAño, setCalAño] = useState(() => {
    const now = new Date();
    return parseInt(now.toLocaleString('en-US', { timeZone: 'America/Lima', year: 'numeric' }));
  });

  useEffect(() => {
    const fetchAulas = async () => {
      try {
        const { data } = await obtenerAulasTutor();
        const lista = data.data || [];
        setAulas(lista);
        if (lista.length > 0) setAulaSeleccionada(lista[0].id);
      } catch { /* silenciar */ }
    };
    fetchAulas();
  }, []);

  const fetchAsistencia = async () => {
    if (!aulaSeleccionada) return;
    setLoading(true);
    try {
      const { data } = await asistenciaHoy({ id_aula: aulaSeleccionada });
      setDatos(data.data || []);
    } catch {
      setDatos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAsistencia(); }, [aulaSeleccionada]);

  useSocket('asistencia:evento', () => fetchAsistencia());

  // Cargar calendario cuando cambia alumno/mes/año
  useEffect(() => {
    if (!calAlumno) return;
    const fetchCal = async () => {
      setCalLoading(true);
      try {
        const { data } = await calendarioAlumno({ id_alumno: calAlumno.id, mes: calMes, anio: calAño });
        setCalDatos(data.data || []);
      } catch {
        setCalDatos([]);
      } finally {
        setCalLoading(false);
      }
    };
    fetchCal();
  }, [calAlumno, calMes, calAño]);

  const abrirCalendario = (alumno) => {
    const now = new Date();
    setCalMes(parseInt(now.toLocaleString('en-US', { timeZone: 'America/Lima', month: 'numeric' })));
    setCalAño(parseInt(now.toLocaleString('en-US', { timeZone: 'America/Lima', year: 'numeric' })));
    setCalAlumno(alumno);
    setCalDatos([]);
    setCalModal(true);
  };

  const cerrarCalendario = () => {
    setCalModal(false);
    setCalAlumno(null);
    setCalDatos([]);
  };

  const estadoColor = (estado) => {
    const conf = ESTADO_ASISTENCIA_LABELS[estado];
    return conf ? conf.color : 'bg-cream-100 text-gold-600';
  };

  const columns = [
    { header: 'Alumno', render: (r) => r.nombre_completo },
    { header: 'Estado', render: (r) => {
      const conf = ESTADO_ASISTENCIA_LABELS[r.estado];
      return r.estado ? <Badge variant={r.estado === 'PRESENTE' ? 'success' : r.estado === 'TARDE' ? 'warning' : 'danger'}>{conf?.label}</Badge> : <Badge>Sin registro</Badge>;
    }},
    { header: 'Ingreso', render: (r) => r.hora_ingreso ? formatHora(r.hora_ingreso) : '-' },
    { header: 'Salida', render: (r) => {
      if (r.salida_no_registrada) return <span className="text-amber-600 text-xs">No registrada</span>;
      return r.hora_salida ? formatHora(r.hora_salida) : '-';
    }},
    { header: 'Historial', render: (r) => (
      <button onClick={() => abrirCalendario(r)} className="p-2 text-gold-600 hover:text-primary-700 hover:bg-cream-100 rounded-lg transition-colors" title="Ver calendario de asistencia">
        <HiCalendar className="w-5 h-5" />
      </button>
    )},
  ];

  return (
    <div>
      <h1 className="page-title mb-4">Asistencia Hoy</h1>

      {/* Selector de aula */}
      {aulas.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {aulas.map(a => (
            <div
              key={a.id}
              onClick={() => setAulaSeleccionada(a.id)}
              className={`cursor-pointer p-4 rounded-lg border-2 transition-colors text-center ${aulaSeleccionada === a.id ? 'border-gold-400 bg-gold-50' : 'border-cream-200 bg-white hover:border-cream-300'}`}
            >
              <p className="font-semibold text-primary-800">{a.grado?.nombre} {a.seccion}</p>
              {a.grado?.nivel && <p className="text-xs text-gold-600 mt-1">{a.grado.nivel}</p>}
            </div>
          ))}
        </div>
      )}
      <Card>
        <DataTable columns={columns} data={datos} loading={loading} emptyMessage="No hay datos de asistencia hoy" rowsPerPage={15} />
      </Card>

      {/* Modal calendario de asistencia del alumno */}
      <Modal isOpen={calModal} onClose={cerrarCalendario} title={`Historial - ${calAlumno?.nombre_completo || ''}`} size="md">
        <div className="flex gap-3 mb-4">
          <select value={calMes} onChange={(e) => setCalMes(parseInt(e.target.value))} className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm">
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('es-PE', { month: 'long' })}</option>)}
          </select>
          <input type="number" value={calAño} onChange={(e) => setCalAño(parseInt(e.target.value))} className="px-3 py-2 border border-cream-300 rounded-lg outline-none w-24 text-sm" />
        </div>

        {calLoading ? <LoadingSpinner /> : calDatos.length === 0 ? (
          <p className="text-center text-gold-600 py-8">No hay registros para este periodo</p>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="text-center text-sm font-semibold text-primary-700 py-2">{d}</div>
            ))}
            {calDatos.map((dia, i) => (
              <div key={i} className={`text-center py-3 rounded text-sm ${dia.estado ? `${estadoColor(dia.estado)} font-semibold` : dia.dia ? 'bg-cream-50 text-cream-500' : ''}`}>
                {dia.dia && <div className="font-semibold text-base">{dia.dia}</div>}
                {dia.estado && <div className="text-xs font-medium">{dia.estado === 'NO_LECTIVO' ? 'E' : ESTADO_ASISTENCIA_LABELS[dia.estado]?.label?.charAt(0)}</div>}
                {dia.salida_no_registrada && <div className="text-[10px] text-amber-700 font-medium">Sin salida</div>}
              </div>
            ))}
          </div>
        )}

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-cream-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></span>
            <span className="text-primary-800 font-medium">Asistió</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></span>
            <span className="text-primary-800 font-medium">Tardanza</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded bg-red-100 border border-red-300"></span>
            <span className="text-primary-800 font-medium">Faltó</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};


const CalendarizacionAdmin = () => {
  const [anios, setAnios] = useState([]);
  const [anioActivo, setAnioActivo] = useState('');
  const [mes, setMes] = useState(() => new Date().getMonth() + 1);
  const [dias, setDias] = useState([]);
  const [desde, setDesde] = useState(todayLimaISO());
  const [hasta, setHasta] = useState(todayLimaISO());
  const [nota, setNota] = useState('Vacaciones');
  const [loading, setLoading] = useState(false);

  const cargarAnios = async () => {
    const { data } = await listarAnios();
    const lista = data.data || [];
    setAnios(lista);
    const activo = lista.find(a => a.activo) || lista[0];
    if (activo) setAnioActivo(activo.id);
  };

  const cargarCalendario = async () => {
    if (!anioActivo) return;
    setLoading(true);
    try {
      const { data } = await obtenerCalendario(anioActivo);
      setDias(data.data || []);
    } catch {
      setDias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarAnios(); }, []);
  useEffect(() => { cargarCalendario(); }, [anioActivo]);

  const diasMes = () => {
    const anio = Number(anios.find(a => a.id === Number(anioActivo))?.anio || new Date().getFullYear());
    const total = new Date(anio, mes, 0).getDate();
    const inicio = new Date(anio, mes - 1, 1).getDay();
    const espacios = (inicio + 6) % 7;
    const mapa = new Map(dias.map(d => [String(d.fecha).slice(0, 10), d]));
    return [
      ...Array.from({ length: espacios }, () => null),
      ...Array.from({ length: total }, (_, i) => {
        const dia = i + 1;
        const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        return { dia, fecha, especial: mapa.get(fecha) };
      })
    ];
  };

  const fechasRango = () => {
    const res = [];
    const ini = new Date(`${desde}T00:00:00`);
    const fin = new Date(`${hasta}T00:00:00`);
    for (let d = ini; d <= fin; d.setDate(d.getDate() + 1)) {
      res.push(d.toISOString().slice(0, 10));
    }
    return res;
  };

  const guardarRango = async (esLectivo) => {
    if (!anioActivo || !desde || !hasta) return;
    try {
      await Promise.all(fechasRango().map(fecha =>
        actualizarDiaCalendario({
          id_anio_escolar: anioActivo,
          fecha,
          es_dia_lectivo: esLectivo,
          nota: esLectivo ? '' : nota
        })
      ));
      toast.success(esLectivo ? 'Fechas restauradas' : 'Fechas marcadas');
      cargarCalendario();
    } catch {
      toast.error('No se pudo guardar la calendarizacion');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Calendarizacion</h1>
      </div>
      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">AÃ±o escolar</label>
            <select value={anioActivo} onChange={(e) => setAnioActivo(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm">
              {anios.map(a => <option key={a.id} value={a.id}>{a.anio}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Mes</label>
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm">
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('es-PE', { month: 'long' })}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Motivo</label>
            <select value={nota} onChange={(e) => setNota(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm">
              {['Vacaciones', 'Feriado', 'Dia no laborable', 'Desfile', 'Suspension de clases', 'Otro'].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={() => guardarRango(false)} className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium">Marcar fecha especial</button>
          <button onClick={() => guardarRango(true)} className="px-4 py-2 bg-cream-100 text-primary-700 rounded-lg hover:bg-cream-200 text-sm font-medium">Restaurar como lectivo</button>
        </div>
      </Card>
      <Card>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-7 gap-1">
            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => <div key={d} className="text-center text-sm font-semibold text-primary-700 py-2">{d}</div>)}
            {diasMes().map((d, i) => d ? (
              <button key={i} type="button" onClick={() => { setDesde(d.fecha); setHasta(d.fecha); }} className={`min-h-[72px] rounded p-2 text-left text-sm border ${d.especial && d.especial.es_dia_lectivo === false ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-cream-50 border-cream-100 text-primary-800'}`}>
                <div className="font-semibold">{d.dia}</div>
                {d.especial && d.especial.es_dia_lectivo === false && <div className="text-xs mt-1 leading-tight">{d.especial.nota || 'Dia no lectivo'}</div>}
              </button>
            ) : <div key={i} />)}
          </div>
        )}
      </Card>
    </div>
  );
};

const AsistenciaAdmin = () => {
  const [adminTab, setAdminTab] = useState('global');
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(todayLimaISO());
  const [filtros, setFiltros] = useState({ id_nivel: '', id_grado: '', id_aula: '', estado: '', buscar: '' });
  const [niveles, setNiveles] = useState([]);
  const [grados, setGrados] = useState([]);
  const [aulasDisponibles, setAulasDisponibles] = useState([]);
  const [correccionModal, setCorreccionModal] = useState(false);
  const [correccionForm, setCorreccionForm] = useState({ id_asistencia_dia: '', nuevo_estado: '', motivo: '', hora_ingreso: '', hora_salida: '', eliminar_ingreso: false, eliminar_salida: false });

  useEffect(() => {
    const fetchFiltros = async () => {
      try {
        const [nivelesR, gradosR, aulasR] = await Promise.all([listarNiveles(), listarGrados(), listarAulas()]);
        setNiveles(nivelesR.data.data || []);
        setGrados(gradosR.data.data || []);
        setAulasDisponibles(aulasR.data.data || []);
      } catch { /* silenciar */ }
    };
    fetchFiltros();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { fecha };
      if (filtros.id_nivel) params.id_nivel = filtros.id_nivel;
      if (filtros.id_grado) params.id_grado = filtros.id_grado;
      if (filtros.id_aula) params.id_aula = filtros.id_aula;
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.buscar?.trim()) params.buscar = filtros.buscar.trim();
      const { data } = await asistenciaGlobal(params);
      setDatos(data.data || []);
    } catch {
      setDatos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [fecha]);

  const handleFiltrar = () => fetchData();

  const handleCorreccion = async (e) => {
    e.preventDefault();
    try {
      const payload = { id_asistencia_dia: correccionForm.id_asistencia_dia, motivo: correccionForm.motivo };
      if (correccionForm.nuevo_estado) payload.nuevo_estado = correccionForm.nuevo_estado;
      if (correccionForm.eliminar_ingreso) payload.eliminar_ingreso = true;
      if (correccionForm.eliminar_salida) payload.eliminar_salida = true;
      if (correccionForm.hora_ingreso && !correccionForm.eliminar_ingreso) payload.hora_ingreso = correccionForm.hora_ingreso;
      if (correccionForm.hora_salida && !correccionForm.eliminar_salida) payload.hora_salida = correccionForm.hora_salida;
      await corregirAsistencia(payload);
      toast.success('Asistencia corregida');
      setCorreccionModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleExportar = async () => {
    try {
      const params = { fecha };
      if (filtros.id_nivel) params.id_nivel = filtros.id_nivel;
      if (filtros.id_grado) params.id_grado = filtros.id_grado;
      if (filtros.id_aula) params.id_aula = filtros.id_aula;
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.buscar?.trim()) params.buscar = filtros.buscar.trim();
      const response = await exportarExcelAsistencia(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'asistencia.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar');
    }
  };

  const columns = [
    { header: 'Alumno', render: (r) => r.alumno?.nombre_completo },
    { header: 'Aula', render: (r) => r.alumno?.aula ? `${r.alumno.aula.grado?.nombre || ''} ${r.alumno.aula.seccion}` : '-' },
    { header: 'Estado', render: (r) => {
      const conf = ESTADO_ASISTENCIA_LABELS[r.estado];
      return conf ? <Badge variant={r.estado === 'PRESENTE' ? 'success' : r.estado === 'TARDE' ? 'warning' : 'danger'}>{conf.label}</Badge> : '-';
    }},
    { header: 'Ingreso', render: (r) => r.hora_ingreso ? formatHora(r.hora_ingreso) : '-' },
    { header: 'Salida', render: (r) => {
      if (r.salida_no_registrada) return <span className="text-amber-600 text-xs">No registrada</span>;
      return r.hora_salida ? formatHora(r.hora_salida) : '-';
    }},
    { header: 'Acciones', render: (r) => (
      <button onClick={() => {
        setCorreccionForm({
          id_asistencia_dia: r.id,
          nuevo_estado: r.estado || 'PRESENTE',
          motivo: '',
          hora_ingreso: '',
          hora_salida: '',
          tiene_ingreso: !!r.hora_ingreso,
          tiene_salida: !!r.hora_salida && !r.salida_no_registrada,
        });
        setCorreccionModal(true);
      }}
        className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded hover:bg-amber-100">Corregir</button>
    )},
  ];

  if (adminTab === 'calendarizacion') {
    return (
      <div>
        <div className="flex gap-2 mb-6">
          <button onClick={() => setAdminTab('global')} className="px-4 py-2 rounded-lg bg-cream-100 text-primary-700">Asistencia Global</button>
          <button onClick={() => setAdminTab('calendarizacion')} className="px-4 py-2 rounded-lg bg-primary-700 text-white">Calendarizacion</button>
        </div>
        <CalendarizacionAdmin />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setAdminTab('global')} className="px-4 py-2 rounded-lg bg-primary-700 text-white">Asistencia Global</button>
        <button onClick={() => setAdminTab('calendarizacion')} className="px-4 py-2 rounded-lg bg-cream-100 text-primary-700">Calendarizacion</button>
      </div>
<div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Asistencia Global</h1>
        <button onClick={handleExportar} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
          <HiDownload className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Nivel</label>
            <select value={filtros.id_nivel} onChange={(e) => setFiltros({...filtros, id_nivel: e.target.value, id_grado: '', id_aula: ''})}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm">
              <option value="">Todos</option>
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Grado</label>
            <select value={filtros.id_grado} onChange={(e) => setFiltros({...filtros, id_grado: e.target.value, id_aula: ''})}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm">
              <option value="">Todos</option>
              {grados
                .filter(g => !filtros.id_nivel || g.nivel?.id === parseInt(filtros.id_nivel))
                .map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Sección</label>
            <select value={filtros.id_aula} onChange={(e) => setFiltros({...filtros, id_aula: e.target.value})}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm">
              <option value="">Todas</option>
              {aulasDisponibles
                .filter(a => !filtros.id_grado || a.id_grado === parseInt(filtros.id_grado))
                .filter(a => !filtros.id_nivel || a.grado?.nivel?.id === parseInt(filtros.id_nivel))
                .map(a => <option key={a.id} value={a.id}>{a.grado?.nombre} {a.seccion}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gold-600 mb-1">Estado</label>
            <select value={filtros.estado} onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
              className="px-3 py-2 border border-cream-300 rounded-lg outline-none text-sm">
              <option value="">Todos</option>
              <option value="PRESENTE">Asistió</option>
              <option value="TARDE">Tardanza</option>
              <option value="AUSENTE">Faltó</option>
            </select>
          </div>

          <div className="min-w-[240px] flex-1">
            <label className="block text-xs font-medium text-gold-600 mb-1">Buscar</label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
              <input
                type="text"
                value={filtros.buscar}
                onChange={(e) => setFiltros({...filtros, buscar: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && handleFiltrar()}
                className="w-full pl-9 pr-3 py-2 border border-cream-300 rounded-lg outline-none text-sm"
                placeholder="Nombre, DNI, cÃ³digo..."
              />
            </div>
          </div>
          <button onClick={handleFiltrar} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
            Filtrar
          </button>
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={datos} loading={loading} emptyMessage="No hay registros para esta fecha" rowsPerPage={15} />
      </Card>

      <Modal isOpen={correccionModal} onClose={() => setCorreccionModal(false)} title="Corregir Asistencia" size="sm">
        <form onSubmit={handleCorreccion} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Nuevo Estado</label>
            <select value={correccionForm.nuevo_estado} onChange={(e) => setCorreccionForm({...correccionForm, nuevo_estado: e.target.value})}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none">
              <option value="PRESENTE">Asistió</option>
              <option value="TARDE">Tardanza</option>
              <option value="AUSENTE">Faltó</option>
            </select>
          </div>
          {correccionForm.tiene_ingreso && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Corregir Hora de Ingreso</label>
              <input
                type="time"
                value={correccionForm.hora_ingreso}
                onChange={(e) => setCorreccionForm({...correccionForm, hora_ingreso: e.target.value})}
                disabled={correccionForm.eliminar_ingreso}
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none disabled:bg-cream-100 disabled:text-primary-800/40"
              />
              <p className="text-xs text-gold-500 mt-1">Dejar vacÍo si no desea modificar</p>
              <label className="mt-2 flex items-center gap-2 text-sm text-red-700">
                <input
                  type="checkbox"
                  checked={correccionForm.eliminar_ingreso}
                  onChange={(e) => setCorreccionForm({...correccionForm, eliminar_ingreso: e.target.checked, hora_ingreso: e.target.checked ? '' : correccionForm.hora_ingreso})}
                  className="accent-red-600"
                />
                Eliminar escaneo de ingreso
              </label>
            </div>
          )}
          {correccionForm.tiene_salida && (
            <div>
              <label className="block text-sm font-medium text-primary-800/80 mb-1">Corregir Hora de Salida</label>
              <input
                type="time"
                value={correccionForm.hora_salida}
                onChange={(e) => setCorreccionForm({...correccionForm, hora_salida: e.target.value})}
                disabled={correccionForm.eliminar_salida}
                className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none disabled:bg-cream-100 disabled:text-primary-800/40"
              />
              <p className="text-xs text-gold-500 mt-1">Dejar vacÍo si no desea modificar</p>
              <label className="mt-2 flex items-center gap-2 text-sm text-red-700">
                <input
                  type="checkbox"
                  checked={correccionForm.eliminar_salida}
                  onChange={(e) => setCorreccionForm({...correccionForm, eliminar_salida: e.target.checked, hora_salida: e.target.checked ? '' : correccionForm.hora_salida})}
                  className="accent-red-600"
                />
                Eliminar escaneo de salida
              </label>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-primary-800/80 mb-1">Motivo (obligatorio)</label>
            <textarea value={correccionForm.motivo} onChange={(e) => setCorreccionForm({...correccionForm, motivo: e.target.value})} required
              className="w-full px-3 py-2 border border-cream-300 rounded-lg outline-none" rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCorreccionModal(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200">Cancelar</button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm text-white rounded-lg ${
                correccionForm.eliminar_ingreso || correccionForm.eliminar_salida
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {correccionForm.eliminar_ingreso || correccionForm.eliminar_salida ? 'Eliminar y guardar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Asistencia;



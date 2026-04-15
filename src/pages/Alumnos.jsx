import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CarnetCard from '../components/CarnetCard';
import { listarAlumnos, crearAlumno, actualizarAlumno, obtenerCarnet, eliminarAlumno } from '../services/alumnosService';
import { listarAulas, listarNiveles } from '../services/configEscolarService';
import { buscarPadres } from '../services/padresService';
import { HiPlus, HiPencil, HiEye, HiEyeOff, HiSearch, HiDownload, HiPhotograph, HiUserAdd, HiTrash } from 'react-icons/hi';
import { fileUrl } from '../utils/constants';
import { toJpeg } from 'html-to-image';
import { getEmbeddedFontCSS } from './CarnetView';
import JSZip from 'jszip';
import toast from 'react-hot-toast';

const Alumnos = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  // Form alumno
  const [form, setForm] = useState({ codigo_alumno: '', dni: '', nombre_completo: '', monto_pension: '', id_nivel: '', id_grado: '', id_aula: '' });
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const fotoInputRef = useRef(null);

  // Padre (solo para creacion)
  const [padreBusqueda, setPadreBusqueda] = useState('');
  const [padreResultados, setPadreResultados] = useState([]);
  const [padreSeleccionado, setPadreSeleccionado] = useState(null);
  const [padreNuevo, setPadreNuevo] = useState(false);
  const [buscandoPadre, setBuscandoPadre] = useState(false);
  const [padreForm, setPadreForm] = useState({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });
  const [showPadrePassword, setShowPadrePassword] = useState(false);
  const debounceRef = useRef(null);

  // Filtros tabla
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState('');
  const [filtroCodigo, setFiltroCodigo] = useState('');

  // Modal carnet
  const [carnetModalOpen, setCarnetModalOpen] = useState(false);
  const [carnetData, setCarnetData] = useState(null);
  const [carnetLoading, setCarnetLoading] = useState(false);
  const carnetRef = useRef(null);

  // Modal eliminar
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [alumnoAEliminar, setAlumnoAEliminar] = useState(null);

  // Descarga masiva
  const [descargaMasivaLoading, setDescargaMasivaLoading] = useState(false);
  const [descargaMasivaProgreso, setDescargaMasivaProgreso] = useState({ actual: 0, total: 0 });

  // ===================== FETCH DATA =====================
  const fetchData = async () => {
    setLoading(true);
    try {
      const [alumnosR, aulasR, nivelesR] = await Promise.all([
        listarAlumnos(), listarAulas(), listarNiveles(),
      ]);
      setAlumnos(alumnosR.data.data || []);
      setAulas(aulasR.data.data || []);
      setNiveles(nivelesR.data.data || []);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ===================== CASCADING SELECTS (FORM) =====================
  const gradosDelNivel = useMemo(() => {
    if (!form.id_nivel) return [];
    const nivel = niveles.find(n => n.id === parseInt(form.id_nivel));
    const grados = nivel?.grados || [];
    const gradoIdsConAula = new Set(aulas.map(a => a.id_grado));
    return grados.filter(g => gradoIdsConAula.has(g.id));
  }, [niveles, aulas, form.id_nivel]);

  const aulasDelGrado = useMemo(() => {
    if (!form.id_grado) return [];
    return aulas.filter(a => a.id_grado === parseInt(form.id_grado));
  }, [aulas, form.id_grado]);

  // ===================== FILTROS TABLA =====================
  const nivelesUnicos = useMemo(() => {
    const set = new Set(alumnos.map(a => a.aula?.grado?.nivel).filter(Boolean));
    return [...set].sort();
  }, [alumnos]);

  const gradosFiltrados = useMemo(() => {
    const set = new Set(
      alumnos
        .filter(a => !filtroNivel || a.aula?.grado?.nivel === filtroNivel)
        .map(a => a.aula?.grado?.nombre)
        .filter(Boolean)
    );
    return [...set].sort();
  }, [alumnos, filtroNivel]);

  const seccionesFiltradas = useMemo(() => {
    const set = new Set(
      alumnos
        .filter(a => {
          if (filtroNivel && a.aula?.grado?.nivel !== filtroNivel) return false;
          if (filtroGrado && a.aula?.grado?.nombre !== filtroGrado) return false;
          return true;
        })
        .map(a => a.aula?.seccion)
        .filter(Boolean)
    );
    return [...set].sort();
  }, [alumnos, filtroNivel, filtroGrado]);

  const alumnosFiltrados = useMemo(() => {
    return alumnos.filter(a => {
      if (filtroNivel && a.aula?.grado?.nivel !== filtroNivel) return false;
      if (filtroGrado && a.aula?.grado?.nombre !== filtroGrado) return false;
      if (filtroSeccion && a.aula?.seccion !== filtroSeccion) return false;
      if (filtroCodigo) {
        const busqueda = filtroCodigo.toLowerCase();
        const coincideCodigo = a.codigo_alumno?.toLowerCase().includes(busqueda);
        const coincideNombre = a.nombre_completo?.toLowerCase().includes(busqueda);
        if (!coincideCodigo && !coincideNombre) return false;
      }
      return true;
    });
  }, [alumnos, filtroNivel, filtroGrado, filtroSeccion, filtroCodigo]);

  // ===================== CARNET =====================
  const handleVerCarnet = async (id_alumno) => {
    setCarnetModalOpen(true);
    setCarnetLoading(true);
    setCarnetData(null);
    try {
      const res = await obtenerCarnet(id_alumno);
      setCarnetData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar carnet');
      setCarnetModalOpen(false);
    } finally {
      setCarnetLoading(false);
    }
  };

  const handleDescargarCarnet = async () => {
    if (!carnetData || !carnetRef.current) return;
    try {
      const fontCSS = await getEmbeddedFontCSS();
      const el = carnetRef.current;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:inline-block;padding:4px;';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      let dataUrl;
      try {
        dataUrl = await toJpeg(wrapper, {
          quality: 0.95,
          pixelRatio: 3,
          cacheBust: true,
          backgroundColor: '#ffffff',
          fontEmbedCSS: fontCSS,
        });
      } finally {
        wrapper.parentNode.insertBefore(el, wrapper);
        wrapper.remove();
      }

      const link = document.createElement('a');
      link.download = `fotocheck-${carnetData.alumno.codigo_alumno}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error('Error al descargar el fotocheck');
    }
  };

  // ===================== DESCARGA MASIVA =====================
  const filtrosCompletos = filtroNivel && filtroGrado && filtroSeccion;

  const handleDescargarMasivo = async () => {
    if (!filtrosCompletos) return;

    const alumnosConCarnet = alumnosFiltrados.filter(a => a.carnet?.qr_token);
    if (alumnosConCarnet.length === 0) {
      toast.error('No hay alumnos con carnet en esta sección');
      return;
    }

    setDescargaMasivaLoading(true);
    setDescargaMasivaProgreso({ actual: 0, total: alumnosConCarnet.length });

    try {
      const fontCSS = await getEmbeddedFontCSS();
      const zip = new JSZip();
      let sinFoto = 0;

      for (let i = 0; i < alumnosConCarnet.length; i++) {
        const a = alumnosConCarnet[i];
        setDescargaMasivaProgreso({ actual: i + 1, total: alumnosConCarnet.length });

        // Formatear datos del alumno para el CarnetCard (misma estructura que obtenerCarnet)
        const alumnoData = {
          nombre_completo: a.nombre_completo,
          codigo_alumno: a.codigo_alumno,
          foto_url: a.foto_url,
          aula: `${a.aula?.grado?.nombre || ''} ${a.aula?.seccion || ''}`.trim(),
          nivel: a.aula?.grado?.nivel || '',
        };
        const carnetData = {
          qr_token: a.carnet.qr_token,
          version: a.carnet.version,
        };

        if (!a.foto_url) sinFoto++;

        // Renderizar CarnetCard en un contenedor off-screen
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
        document.body.appendChild(container);

        const cardWrapper = document.createElement('div');
        container.appendChild(cardWrapper);

        const root = createRoot(cardWrapper);
        await new Promise((resolve) => {
          root.render(<CarnetCard alumno={alumnoData} carnet={carnetData} carnetRef={{ current: null }} />);
          // Esperar al siguiente frame para que el DOM se renderice completamente
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });

        // Obtener el elemento del carnet renderizado
        const carnetEl = cardWrapper.firstElementChild;
        if (!carnetEl) {
          root.unmount();
          container.remove();
          continue;
        }

        // Aplicar wrapper con padding (mismo que descarga individual)
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:inline-block;padding:4px;';
        carnetEl.parentNode.insertBefore(wrapper, carnetEl);
        wrapper.appendChild(carnetEl);

        try {
          // Esperar a que las imágenes se carguen
          const imgs = wrapper.querySelectorAll('img');
          await Promise.all([...imgs].map(img =>
            img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
          ));

          // Generar JPEG con exactamente los mismos parámetros que la descarga individual
          const dataUrl = await toJpeg(wrapper, {
            quality: 0.95,
            pixelRatio: 3,
            cacheBust: true,
            backgroundColor: '#ffffff',
            fontEmbedCSS: fontCSS,
          });

          // Convertir data URL a blob y agregar al ZIP
          const base64 = dataUrl.split(',')[1];
          zip.file(`fotocheck-${a.codigo_alumno}.jpg`, base64, { base64: true });
        } finally {
          root.unmount();
          container.remove();
        }
      }

      // Generar y descargar el ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `fotochecks-${filtroGrado}-${filtroSeccion}.zip`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);

      if (sinFoto > 0) {
        toast.success(`Descarga completada. ${sinFoto} alumno${sinFoto > 1 ? 's' : ''} sin foto ${sinFoto > 1 ? 'fueron incluidos' : 'fue incluido'} con imagen placeholder.`);
      } else {
        toast.success('Fotochecks descargados correctamente');
      }
    } catch (err) {
      console.error('Error en descarga masiva:', err);
      toast.error('Error al generar los fotochecks');
    } finally {
      setDescargaMasivaLoading(false);
      setDescargaMasivaProgreso({ actual: 0, total: 0 });
    }
  };

  // ===================== FOTO =====================
  const handleFotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  // ===================== BUSCAR PADRE (AUTOCOMPLETE) =====================
  const handlePadreBusquedaChange = useCallback((valor) => {
    setPadreBusqueda(valor);
    setPadreSeleccionado(null);
    setPadreNuevo(false);
    setPadreForm({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (valor.length < 2) {
      setPadreResultados([]);
      setBuscandoPadre(false);
      return;
    }

    setBuscandoPadre(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await buscarPadres(valor);
        setPadreResultados(res.data.data || []);
      } catch {
        setPadreResultados([]);
      } finally {
        setBuscandoPadre(false);
      }
    }, 300);
  }, []);

  const handleSeleccionarPadre = (padre) => {
    setPadreSeleccionado(padre);
    setPadreBusqueda(padre.dni);
    setPadreResultados([]);
    setPadreNuevo(false);
  };

  const handleRegistrarNuevoPadre = () => {
    setPadreNuevo(true);
    setPadreSeleccionado(null);
    setPadreResultados([]);
    setPadreForm({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });
  };

  // ===================== OPEN/CLOSE MODALS =====================
  const openCreate = () => {
    setEditando(null);
    setForm({ codigo_alumno: '', dni: '', nombre_completo: '', monto_pension: '', id_nivel: '', id_grado: '', id_aula: '' });
    setFotoFile(null);
    setFotoPreview(null);
    setPadreBusqueda('');
    setPadreResultados([]);
    setPadreSeleccionado(null);
    setPadreNuevo(false);
    setPadreForm({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setEditando(a);
    // Determinar id_nivel e id_grado a partir del aula
    const aulaObj = aulas.find(au => au.id === a.id_aula);
    const id_grado = aulaObj?.id_grado || '';
    let id_nivel = '';
    if (id_grado) {
      const nivel = niveles.find(n => n.grados?.some(g => g.id === parseInt(id_grado)));
      id_nivel = nivel?.id || '';
    }
    setForm({
      codigo_alumno: a.codigo_alumno,
      dni: a.dni || '',
      nombre_completo: a.nombre_completo,
      monto_pension: a.monto_pension != null ? String(a.monto_pension) : '',
      id_nivel: String(id_nivel),
      id_grado: String(id_grado),
      id_aula: String(a.id_aula),
    });
    setFotoFile(null);
    setFotoPreview(fileUrl(a.foto_url));
    // Pre-seleccionar padre actual si existe
    const padreActual = a.padre_alumno?.[0]?.padre;
    if (padreActual) {
      setPadreSeleccionado(padreActual);
      setPadreBusqueda(padreActual.dni || '');
    } else {
      setPadreSeleccionado(null);
      setPadreBusqueda('');
    }
    setPadreResultados([]);
    setPadreNuevo(false);
    setPadreForm({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });
    setModalOpen(true);
  };

  // ===================== SUBMIT =====================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('codigo_alumno', form.codigo_alumno);
      fd.append('nombre_completo', form.nombre_completo);
      fd.append('id_aula', form.id_aula);
      if (form.dni) fd.append('dni', form.dni);
      if (form.monto_pension) fd.append('monto_pension', form.monto_pension);
      if (fotoFile) fd.append('foto', fotoFile);

      if (editando) {
        // Enviar padre_id: el padre seleccionado o vacio para desvincular
        if (padreSeleccionado) {
          fd.append('padre_id', padreSeleccionado.id);
        } else {
          // Sin padre seleccionado = desvincular
          fd.append('padre_id', '');
        }
        await actualizarAlumno(editando.id, fd);
        toast.success('Alumno actualizado');
      } else {
        // Datos del padre para creacion
        if (padreSeleccionado) {
          fd.append('padre_dni', padreSeleccionado.dni);
        } else if (padreNuevo) {
          fd.append('padre_dni', padreForm.dni);
          fd.append('padre_nombre', padreForm.nombre_completo);
          fd.append('padre_celular', padreForm.celular);
          fd.append('padre_username', padreForm.username);
          fd.append('padre_contrasena', padreForm.contrasena);
        }
        await crearAlumno(fd);
        toast.success('Alumno creado');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  // ===================== ELIMINAR ALUMNO =====================
  const handleConfirmDelete = (alumno) => {
    setAlumnoAEliminar(alumno);
    setDeleteModalOpen(true);
  };

  const handleEliminar = async () => {
    if (!alumnoAEliminar) return;
    try {
      await eliminarAlumno(alumnoAEliminar.id);
      toast.success('Alumno eliminado');
      setDeleteModalOpen(false);
      setAlumnoAEliminar(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar alumno');
    }
  };

  // ===================== TABLE COLUMNS =====================
  const columns = [
    { header: 'Foto', render: (r) => (
      <div className="flex items-center gap-2">
        {r.foto_url ? (
          <img src={fileUrl(r.foto_url)} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-xs text-gold-600">
            {r.nombre_completo?.charAt(0)}
          </div>
        )}
      </div>
    )},
    { header: 'Código', accessor: 'codigo_alumno' },
    { header: 'DNI', render: (r) => r.dni || '-' },
    { header: 'Nombre', accessor: 'nombre_completo' },
    { header: 'Aula', render: (r) => r.aula ? `${r.aula.grado?.nombre || ''} ${r.aula.seccion}` : '-' },
    { header: 'Estado', render: (r) => <Badge variant={r.estado === 'ACTIVO' ? 'success' : 'danger'}>{r.estado}</Badge> },
    { header: 'Padre', render: (r) => r.padre_alumno?.[0]?.padre?.nombre_completo || 'Sin vincular' },
    { header: 'Acciones', render: (row) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 text-gold-600 hover:bg-gold-50 rounded" title="Editar"><HiPencil className="w-4 h-4" /></button>
        <button onClick={() => handleVerCarnet(row.id)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded" title="Ver carnet"><HiEye className="w-4 h-4" /></button>
        <button onClick={() => handleConfirmDelete(row)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Eliminar"><HiTrash className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const inputClass = 'w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-200 text-sm';
  const labelClass = 'block text-sm font-medium text-primary-800/80 mb-1';
  const sectionTitle = 'text-sm font-semibold text-primary-800 mb-3 flex items-center gap-2';

  // ===================== RENDER =====================
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Alumnos</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
          <HiPlus className="w-4 h-4" /> Nuevo Alumno
        </button>
      </div>

      <Card>
        {/* Filtros */}
        <div className="p-4 border-b border-cream-200 bg-cream-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-primary-800/60 mb-1">Nivel Escolar</label>
              <select
                value={filtroNivel}
                onChange={(e) => { setFiltroNivel(e.target.value); setFiltroGrado(''); setFiltroSeccion(''); }}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white"
              >
                <option value="">Todos los niveles</option>
                {nivelesUnicos.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-primary-800/60 mb-1">Grado</label>
              <select
                value={filtroGrado}
                onChange={(e) => { setFiltroGrado(e.target.value); setFiltroSeccion(''); }}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white"
              >
                <option value="">Todos los grados</option>
                {gradosFiltrados.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-primary-800/60 mb-1">Sección</label>
              <select
                value={filtroSeccion}
                onChange={(e) => setFiltroSeccion(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white"
              >
                <option value="">Todas las secciones</option>
                {seccionesFiltradas.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-primary-800/60 mb-1">Buscar Alumno</label>
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
                <input
                  type="text"
                  value={filtroCodigo}
                  onChange={(e) => setFiltroCodigo(e.target.value)}
                  placeholder="Buscar por código o apellido..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white"
                />
              </div>
            </div>
          </div>
          {(filtroNivel || filtroGrado || filtroSeccion || filtroCodigo) && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-200">
              <span className="text-xs text-primary-800/50">{alumnosFiltrados.length} de {alumnos.length} alumnos</span>
              <div className="flex items-center gap-3">
                {filtrosCompletos && (
                  <button
                    onClick={handleDescargarMasivo}
                    disabled={descargaMasivaLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {descargaMasivaLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generando {descargaMasivaProgreso.actual}/{descargaMasivaProgreso.total}...
                      </>
                    ) : (
                      <>
                        <HiDownload className="w-3.5 h-3.5" />
                        Descargar Fotochecks
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => { setFiltroNivel(''); setFiltroGrado(''); setFiltroSeccion(''); setFiltroCodigo(''); }}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>
        <DataTable columns={columns} data={alumnosFiltrados} loading={loading} emptyMessage="No hay alumnos registrados" rowsPerPage={10} />
      </Card>

      {/* ==================== MODAL CREAR / EDITAR ==================== */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Alumno' : 'Nuevo Alumno'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* --- Datos del Alumno --- */}
          <div className="border-b border-cream-200 pb-4">
            <h4 className={sectionTitle}>Datos del Alumno</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Código Alumno *</label>
                <input
                  type="text"
                  value={form.codigo_alumno}
                  onChange={(e) => setForm({ ...form, codigo_alumno: e.target.value })}
                  required
                  className={inputClass}
                  placeholder={`ALU-${new Date().getFullYear()}-001`}
                />
              </div>
              <div>
                <label className={labelClass}>DNI del Alumno</label>
                <input
                  type="text"
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                  className={inputClass}
                  placeholder="12345678"
                  maxLength={8}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Nombre Completo *</label>
                <input
                  type="text"
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  required
                  className={inputClass}
                  placeholder="Nombres y apellidos"
                />
              </div>
              <div>
                <label className={labelClass}>Monto Pensión (S/.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monto_pension}
                  onChange={(e) => setForm({ ...form, monto_pension: e.target.value })}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* --- Foto del Alumno --- */}
          <div className="border-b border-cream-200 pb-4">
            <h4 className={sectionTitle}>
              <HiPhotograph className="w-4 h-4 text-gold-500" /> Foto del Alumno
            </h4>
            <div className="flex items-center gap-4">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-gold-400" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-cream-100 border-2 border-dashed border-cream-300 flex items-center justify-center">
                  <HiPhotograph className="w-8 h-8 text-cream-400" />
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-medium text-gold-700 bg-gold-50 border border-gold-200 rounded-lg hover:bg-gold-100 transition-colors"
                >
                  {fotoPreview ? 'Cambiar foto' : 'Seleccionar foto'}
                </button>
                <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFotoSelect} />
                <p className="text-xs text-cream-500 mt-1">JPG, PNG o WEBP. Max 5MB.</p>
                {fotoFile && <p className="text-xs text-green-600 mt-0.5">{fotoFile.name}</p>}
              </div>
            </div>
          </div>

          {/* --- Asignacion de Aula (Cascading) --- */}
          <div className="border-b border-cream-200 pb-4">
            <h4 className={sectionTitle}>Asignación de Aula</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Nivel *</label>
                <select
                  value={form.id_nivel}
                  onChange={(e) => setForm({ ...form, id_nivel: e.target.value, id_grado: '', id_aula: '' })}
                  required
                  className={inputClass}
                >
                  <option value="">Seleccione nivel...</option>
                  {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Grado *</label>
                <select
                  value={form.id_grado}
                  onChange={(e) => setForm({ ...form, id_grado: e.target.value, id_aula: '' })}
                  required
                  disabled={!form.id_nivel}
                  className={`${inputClass} ${!form.id_nivel ? 'bg-cream-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">{form.id_nivel ? 'Seleccione grado...' : 'Primero seleccione nivel'}</option>
                  {gradosDelNivel.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Sección *</label>
                <select
                  value={form.id_aula}
                  onChange={(e) => setForm({ ...form, id_aula: e.target.value })}
                  required
                  disabled={!form.id_grado}
                  className={`${inputClass} ${!form.id_grado ? 'bg-cream-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">{form.id_grado ? 'Seleccione sección...' : 'Primero seleccione grado'}</option>
                  {aulasDelGrado.map(a => <option key={a.id} value={a.id}>Sección {a.seccion}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* --- Padre / Apoderado --- */}
          <div className="border-b border-cream-200 pb-4">
            <h4 className={sectionTitle}>Padre / Apoderado</h4>

            {/* Busqueda con autocomplete */}
            {!padreSeleccionado && !padreNuevo && (
              <div className="relative mb-3">
                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-400" />
                  <input
                    type="text"
                    value={padreBusqueda}
                    onChange={(e) => handlePadreBusquedaChange(e.target.value)}
                    placeholder="Buscar por DNI o nombre del padre..."
                    className={`${inputClass} pl-9`}
                  />
                  {buscandoPadre && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Dropdown de resultados */}
                {padreBusqueda.length >= 2 && !buscandoPadre && padreResultados.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-cream-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {padreResultados.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSeleccionarPadre(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gold-50 border-b border-cream-100 last:border-b-0 transition-colors"
                      >
                        <span className="text-sm font-medium text-primary-800">{p.nombre_completo}</span>
                        <span className="text-xs text-cream-500 ml-2">DNI: {p.dni}</span>
                        {p.celular && <span className="text-xs text-cream-500 ml-2">Tel: {p.celular}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Sin resultados */}
                {padreBusqueda.length >= 2 && !buscandoPadre && padreResultados.length === 0 && (
                  <div className="mt-2 p-3 bg-cream-50 border border-cream-200 rounded-lg">
                    <p className="text-sm text-cream-600 mb-2">No se encontraron padres con esa búsqueda.</p>
                    {!editando && (
                      <button
                        type="button"
                        onClick={handleRegistrarNuevoPadre}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gold-600 rounded-lg hover:bg-gold-700 transition-colors"
                      >
                        <HiUserAdd className="w-4 h-4" /> Registrar nuevo padre
                      </button>
                    )}
                  </div>
                )}

                {padreBusqueda.length === 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-cream-500">{editando ? 'Busque por DNI o nombre para cambiar el padre.' : 'Busque por DNI o nombre, o registre un padre nuevo.'}</p>
                    {!editando && (
                      <button
                        type="button"
                        onClick={handleRegistrarNuevoPadre}
                        className="flex items-center gap-1 text-xs font-medium text-gold-600 hover:text-gold-700 transition-colors"
                      >
                        <HiUserAdd className="w-3.5 h-3.5" /> Registrar nuevo
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Padre seleccionado (encontrado) */}
            {padreSeleccionado && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-green-800">{editando ? 'Padre vinculado' : 'Padre seleccionado - se vinculará automáticamente'}</p>
                  <button
                    type="button"
                    onClick={() => { setPadreSeleccionado(null); setPadreBusqueda(''); }}
                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                  >
                    Cambiar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                  <span><strong>Nombre:</strong> {padreSeleccionado.nombre_completo}</span>
                  <span><strong>DNI:</strong> {padreSeleccionado.dni}</span>
                  {padreSeleccionado.celular && <span><strong>Celular:</strong> {padreSeleccionado.celular}</span>}
                </div>
              </div>
            )}

            {/* Formulario de padre nuevo (solo en creacion) */}
            {!editando && padreNuevo && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-amber-800">Registrar nuevo padre</p>
                    <button
                      type="button"
                      onClick={() => { setPadreNuevo(false); setPadreBusqueda(''); setPadreForm({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' }); }}
                      className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>DNI *</label>
                      <input
                        type="text"
                        value={padreForm.dni}
                        onChange={(e) => setPadreForm({ ...padreForm, dni: e.target.value })}
                        required
                        className={inputClass}
                        placeholder="DNI del padre"
                        maxLength={8}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Nombre Completo *</label>
                      <input
                        type="text"
                        value={padreForm.nombre_completo}
                        onChange={(e) => setPadreForm({ ...padreForm, nombre_completo: e.target.value })}
                        required
                        className={inputClass}
                        placeholder="Nombre completo del padre"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Celular *</label>
                      <input
                        type="text"
                        value={padreForm.celular}
                        onChange={(e) => setPadreForm({ ...padreForm, celular: e.target.value })}
                        required
                        className={inputClass}
                        placeholder="999888777"
                        maxLength={9}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Username (acceso al sistema) *</label>
                      <input
                        type="text"
                        value={padreForm.username}
                        onChange={(e) => setPadreForm({ ...padreForm, username: e.target.value })}
                        required
                        className={inputClass}
                        placeholder="usuario.padre"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Contraseña *</label>
                      <div className="relative">
                        <input
                          type={showPadrePassword ? 'text' : 'password'}
                          value={padreForm.contrasena}
                          onChange={(e) => setPadreForm({ ...padreForm, contrasena: e.target.value })}
                          required
                          className={`${inputClass} pr-10`}
                          placeholder="Ingrese contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPadrePassword(!showPadrePassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 hover:text-gold-600 transition-colors"
                        >
                          {showPadrePassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
              {editando ? 'Guardar Cambios' : 'Crear Alumno'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================== MODAL CONFIRMAR ELIMINACION ==================== */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Eliminar Alumno" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-primary-800/80">
            ¿Está seguro que desea eliminar al alumno <strong>{alumnoAEliminar?.nombre_completo}</strong> ({alumnoAEliminar?.codigo_alumno})?
          </p>
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            El alumno será marcado como eliminado. Su código y DNI quedarán disponibles para ser reutilizados.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm text-primary-800/80 bg-cream-100 rounded-lg hover:bg-cream-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleEliminar}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== MODAL CARNET ==================== */}
      <Modal isOpen={carnetModalOpen} onClose={() => setCarnetModalOpen(false)} title="Carnet del Alumno" size="sm">
        {carnetLoading ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : carnetData ? (
          <div>
            <div className="flex justify-center">
              <CarnetCard alumno={carnetData.alumno} carnet={carnetData.carnet} carnetRef={carnetRef} />
            </div>
            <div className="flex justify-center gap-3 mt-5">
              <button
                onClick={handleDescargarCarnet}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium"
              >
                <HiDownload className="w-4 h-4" /> Descargar JPG
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gold-600 py-8">No se pudo cargar el carnet</p>
        )}
      </Modal>
    </div>
  );
};

export default Alumnos;

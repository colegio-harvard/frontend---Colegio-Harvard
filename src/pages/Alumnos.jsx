import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CarnetCard, { CARNET_EXPORT_HEIGHT, CARNET_EXPORT_WIDTH, CARNET_HEIGHT, CARNET_WIDTH } from '../components/CarnetCard';
import { listarAlumnos, crearAlumno, actualizarAlumno, obtenerCarnet, eliminarAlumno, obtenerInventarioEliminacionAlumno, eliminarAlumnoPermanentemente, obtenerSiguienteCodigoAlumno, exportarAulasExcel, obtenerInfoRetiroAlumno, retirarAlumno, reactivarAlumno, obtenerAlertaOperativaAlumno, guardarAlertaOperativaAlumno, resolverAlertaOperativaAlumno, actualizarSiagieAlumno } from '../services/alumnosService';
import { listarAulas, listarNiveles } from '../services/configEscolarService';
import { buscarPadres } from '../services/padresService';
import { HiPlus, HiPencil, HiEye, HiEyeOff, HiSearch, HiDownload, HiPhotograph, HiUserAdd, HiTrash, HiUserRemove, HiExclamation } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { fileUrl, studentPhotoUrl } from '../utils/constants';
import { includesSearchText } from '../utils/textSearch';
import { toJpeg } from 'html-to-image';
import { getEmbeddedFontCSS, waitForCaptureImages } from './CarnetView';
import JSZip from 'jszip';
import toast from 'react-hot-toast';

const Alumnos = () => {
  const { usuario } = useAuth();
  const [alumnos, setAlumnos] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [alertaOperativa, setAlertaOperativa] = useState(null);
  const [alertaForm, setAlertaForm] = useState({ mensaje: '', prioridad: 'URGENTE' });
  const [alertaLoading, setAlertaLoading] = useState(false);
  const [alertaGuardando, setAlertaGuardando] = useState(false);

  // Form alumno
  const [form, setForm] = useState({ codigo_alumno: '', dni: '', nombre_completo: '', monto_matricula: '', monto_materiales: '', monto_pension: '', id_nivel: '', id_grado: '', id_aula: '' });
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
  const [filtroSiagie, setFiltroSiagie] = useState('');
  const [siagieGuardando, setSiagieGuardando] = useState(null);

  // Modal carnet
  const [carnetModalOpen, setCarnetModalOpen] = useState(false);
  const [carnetData, setCarnetData] = useState(null);
  const [carnetLoading, setCarnetLoading] = useState(false);
  const carnetRef = useRef(null);

  // Modal eliminar
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [alumnoAEliminar, setAlumnoAEliminar] = useState(null);
  const [inventarioEliminacion, setInventarioEliminacion] = useState(null);
  const [cargandoEliminacion, setCargandoEliminacion] = useState(false);
  const [eliminandoPermanentemente, setEliminandoPermanentemente] = useState(false);
  const [confirmacionEliminacion, setConfirmacionEliminacion] = useState({ codigo: '', motivo: '', contrasena: '' });
  const [retiroModalOpen, setRetiroModalOpen] = useState(false);
  const [retiroInfo, setRetiroInfo] = useState(null);
  const [retiroLoading, setRetiroLoading] = useState(false);
  const [retiroGuardando, setRetiroGuardando] = useState(false);
  const [retiroForm, setRetiroForm] = useState({
    fecha_retiro: new Date().toISOString().slice(0, 10),
    ultima_clave_cobro: '',
    motivo_retiro: 'Razones económicas',
    observacion_retiro: '',
  });
  const [reactivacionOpen, setReactivacionOpen] = useState(false);
  const [reactivacionInfo, setReactivacionInfo] = useState(null);
  const [reactivacionLoading, setReactivacionLoading] = useState(false);
  const [reactivacionGuardando, setReactivacionGuardando] = useState(false);
  const [reactivacionForm, setReactivacionForm] = useState({ fecha_reingreso: new Date().toISOString().slice(0, 10), primera_clave_cobro: '', observacion_reingreso: '' });

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
      if (filtroSiagie === 'INSCRITO' && !a.siagie_inscrito) return false;
      if (filtroSiagie === 'PENDIENTE' && a.siagie_inscrito) return false;
      if (filtroCodigo) {
        const coincideCodigo = includesSearchText(a.codigo_alumno, filtroCodigo);
        const coincideNombre = includesSearchText(a.nombre_completo, filtroCodigo);
        const coincideDni = includesSearchText(a.dni, filtroCodigo);
        if (!coincideCodigo && !coincideNombre && !coincideDni) return false;
      }
      return true;
    });
  }, [alumnos, filtroNivel, filtroGrado, filtroSeccion, filtroCodigo, filtroSiagie]);

  const handleSiagieChange = async (alumno) => {
    const siguiente = !alumno.siagie_inscrito;
    if (!siguiente && !window.confirm(`¿Marcar a ${alumno.nombre_completo} nuevamente como pendiente en SIAGIE?`)) return;
    setSiagieGuardando(alumno.id);
    try {
      const { data } = await actualizarSiagieAlumno(alumno.id, siguiente);
      setAlumnos(actuales => actuales.map(a => a.id === alumno.id ? { ...a, siagie_inscrito: data.data.siagie_inscrito, siagie_actualizado_en: data.data.siagie_actualizado_en } : a));
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo actualizar SIAGIE');
    } finally { setSiagieGuardando(null); }
  };

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

      await waitForCaptureImages(el);
      const dataUrl = await toJpeg(el, {
          quality: 0.95,
          width: CARNET_WIDTH,
          height: CARNET_HEIGHT,
          canvasWidth: CARNET_EXPORT_WIDTH,
          canvasHeight: CARNET_EXPORT_HEIGHT,
          pixelRatio: 1,
          cacheBust: true,
          includeQueryParams: true,
          backgroundColor: '#ffffff',
          fontEmbedCSS: fontCSS,
      });

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
          id: a.id,
          nombre_completo: a.nombre_completo,
          codigo_alumno: a.codigo_alumno,
          dni: a.dni,
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
          root.render(<CarnetCard key={`${alumnoData.id}-${alumnoData.foto_url || 'sin-foto'}`} alumno={alumnoData} carnet={carnetData} carnetRef={{ current: null }} />);
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

        try {
          // Esperar a que las imágenes se carguen
          await waitForCaptureImages(carnetEl);

          // Generar JPEG con exactamente los mismos parámetros que la descarga individual
          const dataUrl = await toJpeg(carnetEl, {
            quality: 0.95,
            width: CARNET_WIDTH,
            height: CARNET_HEIGHT,
            canvasWidth: CARNET_EXPORT_WIDTH,
            canvasHeight: CARNET_EXPORT_HEIGHT,
            pixelRatio: 1,
            cacheBust: true,
            includeQueryParams: true,
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
  const openCreate = async () => {
    setEditando(null);
    setAlertaOperativa(null);
    setAlertaForm({ mensaje: '', prioridad: 'URGENTE' });
    const baseForm = { codigo_alumno: '', dni: '', nombre_completo: '', monto_matricula: '', monto_materiales: '', monto_pension: '', id_nivel: '', id_grado: '', id_aula: '' };
    setForm(baseForm);
    setFotoFile(null);
    setFotoPreview(null);
    setPadreBusqueda('');
    setPadreResultados([]);
    setPadreSeleccionado(null);
    setPadreNuevo(false);
    setPadreForm({ dni: '', nombre_completo: '', celular: '', username: '', contrasena: '' });
    setModalOpen(true);
    try {
      const res = await obtenerSiguienteCodigoAlumno();
      const codigo = res.data?.data?.codigo_alumno || res.data?.codigo_alumno || '';
      if (codigo) setForm(prev => ({ ...prev, codigo_alumno: codigo }));
    } catch (err) {
      toast.error('No se pudo sugerir el codigo automatico');
    }
  };

  const openEdit = async (a) => {
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
      monto_matricula: a.monto_matricula != null ? String(a.monto_matricula) : '',
      monto_materiales: a.monto_materiales != null ? String(a.monto_materiales) : '',
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
    setAlertaLoading(true);
    try {
      const { data } = await obtenerAlertaOperativaAlumno(a.id);
      const alerta = data.data || null;
      setAlertaOperativa(alerta);
      setAlertaForm({ mensaje: alerta?.mensaje || '', prioridad: alerta?.prioridad || 'URGENTE' });
    } catch {
      setAlertaOperativa(null);
      setAlertaForm({ mensaje: '', prioridad: 'URGENTE' });
      toast.error('No se pudo cargar la alerta operativa');
    } finally { setAlertaLoading(false); }
  };

  const guardarAlerta = async () => {
    if (!editando || !alertaForm.mensaje.trim()) return;
    setAlertaGuardando(true);
    try {
      const { data } = await guardarAlertaOperativaAlumno(editando.id, alertaForm);
      setAlertaOperativa(data.data);
      toast.success('Alerta visible en el próximo ingreso');
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo guardar la alerta'); }
    finally { setAlertaGuardando(false); }
  };

  const resolverAlerta = async () => {
    if (!editando || !alertaOperativa) return;
    setAlertaGuardando(true);
    try {
      await resolverAlertaOperativaAlumno(editando.id);
      setAlertaOperativa(null);
      setAlertaForm({ mensaje: '', prioridad: 'URGENTE' });
      toast.success('Alerta marcada como resuelta');
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo resolver la alerta'); }
    finally { setAlertaGuardando(false); }
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
      if (form.monto_matricula !== '') fd.append('monto_matricula', form.monto_matricula);
      if (form.monto_materiales !== '') fd.append('monto_materiales', form.monto_materiales);
      if (form.monto_pension !== '') fd.append('monto_pension', form.monto_pension);
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
  const handleConfirmDelete = async (alumno) => {
    setAlumnoAEliminar(alumno);
    setDeleteModalOpen(true);
    setInventarioEliminacion(null);
    setConfirmacionEliminacion({ codigo: '', motivo: '', contrasena: '' });
    if (usuario?.rol_codigo !== 'SUPER_ADMIN') return;
    setCargandoEliminacion(true);
    try {
      const { data } = await obtenerInventarioEliminacionAlumno(alumno.id);
      setInventarioEliminacion(data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo preparar la eliminación');
      setDeleteModalOpen(false);
    } finally {
      setCargandoEliminacion(false);
    }
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

  // ===================== RETIRAR ALUMNO =====================
  const abrirRetiro = async (alumno) => {
    setRetiroModalOpen(true);
    setRetiroLoading(true);
    setRetiroInfo(null);
    try {
      const response = await obtenerInfoRetiroAlumno(alumno.id);
      const info = response.data.data;
      setRetiroInfo(info);
      setRetiroForm({
        fecha_retiro: new Date().toISOString().slice(0, 10),
        ultima_clave_cobro: info.conceptos?.[0]?.clave || '',
        motivo_retiro: 'Razones económicas',
        observacion_retiro: '',
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo preparar el retiro');
      setRetiroModalOpen(false);
    } finally {
      setRetiroLoading(false);
    }
  };

  const confirmarRetiro = async () => {
    if (!retiroInfo || !retiroForm.ultima_clave_cobro || !retiroForm.motivo_retiro) return;
    setRetiroGuardando(true);
    try {
      const response = await retirarAlumno(retiroInfo.alumno.id, retiroForm);
      toast.success(response.data.message || 'Alumno retirado');
      setRetiroModalOpen(false);
      setRetiroInfo(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo retirar al alumno');
    } finally {
      setRetiroGuardando(false);
    }
  };

  const indiceUltimoCobro = retiroInfo?.conceptos?.findIndex(c => c.clave === retiroForm.ultima_clave_cobro) ?? -1;
  const deudaConservada = (retiroInfo?.conceptos || [])
    .slice(0, indiceUltimoCobro + 1)
    .reduce((total, concepto) => total + Number(concepto.saldo || 0), 0);
  const conceptosAnulados = (retiroInfo?.conceptos || []).slice(indiceUltimoCobro + 1);

  const abrirReactivacion = async (alumno) => {
    setReactivacionOpen(true); setReactivacionLoading(true); setReactivacionInfo(null);
    try {
      const { data } = await obtenerInfoRetiroAlumno(alumno.id);
      const info = data.data;
      const primeraDisponible = info.conceptos?.find(c => c.estado === 'NO_CORRESPONDE')?.clave || info.conceptos?.[0]?.clave || '';
      setReactivacionInfo(info);
      setReactivacionForm({ fecha_reingreso: new Date().toISOString().slice(0, 10), primera_clave_cobro: primeraDisponible, observacion_reingreso: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo preparar la reactivación'); setReactivacionOpen(false);
    } finally { setReactivacionLoading(false); }
  };

  const handleEliminarPermanentemente = async () => {
    if (!alumnoAEliminar || !inventarioEliminacion) return;
    setEliminandoPermanentemente(true);
    try {
      const { data } = await eliminarAlumnoPermanentemente(alumnoAEliminar.id, {
        codigo_confirmacion: confirmacionEliminacion.codigo,
        motivo: confirmacionEliminacion.motivo,
        contrasena: confirmacionEliminacion.contrasena,
      });
      toast.success(data.data?.mensaje || 'Alumno eliminado permanentemente');
      setDeleteModalOpen(false);
      setAlumnoAEliminar(null);
      setInventarioEliminacion(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo eliminar al alumno');
    } finally {
      setEliminandoPermanentemente(false);
    }
  };

  const confirmarReactivacion = async () => {
    if (!reactivacionInfo || !reactivacionForm.primera_clave_cobro) return;
    setReactivacionGuardando(true);
    try {
      const { data } = await reactivarAlumno(reactivacionInfo.alumno.id, reactivacionForm);
      toast.success(data.message || 'Alumno reactivado'); setReactivacionOpen(false); setReactivacionInfo(null); fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo reactivar al alumno'); }
    finally { setReactivacionGuardando(false); }
  };

  const deudaHistoricaReactivacion = (reactivacionInfo?.conceptos || []).filter(c => c.estado !== 'NO_CORRESPONDE').reduce((s, c) => s + Number(c.saldo || 0), 0);
  const indicePrimerCobro = reactivacionInfo?.conceptos?.findIndex(c => c.clave === reactivacionForm.primera_clave_cobro) ?? -1;
  const conceptoReingreso = indicePrimerCobro >= 0 ? reactivacionInfo.conceptos[indicePrimerCobro] : null;
  const cobroReingreso = conceptoReingreso?.estado === 'NO_CORRESPONDE' ? Math.max(Number(conceptoReingreso.monto_total || 0) - Number(conceptoReingreso.monto_pagado || 0), 0) : 0;

  // ===================== TABLE COLUMNS =====================
  const columns = [
    { header: 'Foto', render: (r) => (
      <div className="flex items-center gap-2">
        {r.foto_url ? (
          <img src={studentPhotoUrl(r.id, r.foto_url)} alt={r.nombre_completo} className="w-8 h-8 rounded-full object-cover" />
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
    { header: 'Estado', render: (r) => <Badge variant={r.estado === 'ACTIVO' ? 'success' : r.estado === 'RETIRADO' ? 'warning' : 'danger'}>{r.estado}</Badge> },
    { header: 'SIAGIE', render: (r) => (
      <label className="inline-flex items-center gap-2 cursor-pointer" title={r.siagie_actualizado_en ? `Actualizado: ${new Date(r.siagie_actualizado_en).toLocaleString('es-PE')}` : 'Pendiente de inscripción'}>
        <input type="checkbox" checked={Boolean(r.siagie_inscrito)} disabled={siagieGuardando === r.id} onChange={() => handleSiagieChange(r)} className="w-5 h-5 accent-emerald-600 cursor-pointer disabled:opacity-50" aria-label={`${r.nombre_completo}: ${r.siagie_inscrito ? 'inscrito' : 'pendiente'} en SIAGIE`} />
        <span className={`text-xs font-semibold ${r.siagie_inscrito ? 'text-emerald-700' : 'text-amber-700'}`}>{r.siagie_inscrito ? 'Inscrito' : 'Pendiente'}</span>
      </label>
    )},
    { header: 'Padre', render: (r) => r.padre_alumno?.[0]?.padre?.nombre_completo || 'Sin vincular' },
    { header: 'Acciones', render: (row) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 text-gold-600 hover:bg-gold-50 rounded" title="Editar"><HiPencil className="w-4 h-4" /></button>
        <button onClick={() => handleVerCarnet(row.id)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded" title="Ver carnet"><HiEye className="w-4 h-4" /></button>
        {usuario?.rol_codigo === 'SUPER_ADMIN' && row.estado === 'ACTIVO' && (
          <button onClick={() => abrirRetiro(row)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Retirar alumno"><HiUserRemove className="w-4 h-4" /></button>
        )}
        {usuario?.rol_codigo === 'SUPER_ADMIN' && row.estado === 'RETIRADO' && (
          <button onClick={() => abrirReactivacion(row)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Reactivar alumno"><HiUserAdd className="w-4 h-4" /></button>
        )}
        <button onClick={() => handleConfirmDelete(row)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Eliminar"><HiTrash className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const inputClass = 'w-full px-3 py-2 border border-cream-300 rounded-lg outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-200 text-sm';
  const labelClass = 'block text-sm font-medium text-primary-800/80 mb-1';
  const sectionTitle = 'text-sm font-semibold text-primary-800 mb-3 flex items-center gap-2';


  const handleExportarAulasExcel = async () => {
    try {
      const response = await exportarAulasExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `aulas-alumnos-${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel de aulas descargado');
    } catch {
      toast.error('No se pudo descargar el Excel');
    }
  };
  // ===================== RENDER =====================
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Alumnos</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportarAulasExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm text-sm font-medium">
            <HiDownload className="w-4 h-4" /> Exportar Aulas Excel
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm text-sm font-medium">
            <HiPlus className="w-4 h-4" /> Nuevo Alumno
          </button>
        </div>
      </div>

      <Card>
        {/* Filtros */}
        <div className="p-4 border-b border-cream-200 bg-cream-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
            <div>
              <label className="block text-xs font-medium text-primary-800/60 mb-1">SIAGIE</label>
              <select value={filtroSiagie} onChange={(e) => setFiltroSiagie(e.target.value)} className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg outline-none bg-white">
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="INSCRITO">Inscritos</option>
              </select>
            </div>
          </div>
          {(filtroNivel || filtroGrado || filtroSeccion || filtroCodigo || filtroSiagie) && (
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
                  onClick={() => { setFiltroNivel(''); setFiltroGrado(''); setFiltroSeccion(''); setFiltroCodigo(''); setFiltroSiagie(''); }}
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
                <label className={labelClass}>Matrícula (S/.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monto_matricula}
                  onChange={(e) => setForm({ ...form, monto_matricula: e.target.value })}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={labelClass}>Materiales (S/.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monto_materiales}
                  onChange={(e) => setForm({ ...form, monto_materiales: e.target.value })}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={labelClass}>Pensión (S/.)</label>
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
              <div>
                <label className={labelClass}>Celular del Apoderado</label>
                <input
                  type="text"
                  value={padreSeleccionado?.celular || 'Sin apoderado vinculado'}
                  readOnly
                  className={`${inputClass} bg-cream-50 text-primary-800/80`}
                />
              </div>
            </div>
          </div>

          {editando && (
            <div className="border-b border-cream-200 pb-4">
              <h4 className={sectionTitle}><HiExclamation className="w-4 h-4 text-red-600" /> Alerta especial de ingreso</h4>
              <p className="text-xs text-primary-800/60 mb-3">Será visible para administración y portería después de registrar el ingreso. No bloquea la asistencia.</p>
              {alertaLoading ? <div className="py-3"><LoadingSpinner /></div> : (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_170px] gap-3">
                    <div><label className={labelClass}>Mensaje operativo</label><textarea value={alertaForm.mensaje} onChange={(e) => setAlertaForm({ ...alertaForm, mensaje: e.target.value })} className={`${inputClass} min-h-20 resize-y`} maxLength={250} placeholder="Ej.: FUM pendiente de entrega ¡Urgente!" /><p className="text-[11px] text-primary-800/45 mt-1">{alertaForm.mensaje.length}/250 caracteres</p></div>
                    <div><label className={labelClass}>Prioridad</label><select value={alertaForm.prioridad} onChange={(e) => setAlertaForm({ ...alertaForm, prioridad: e.target.value })} className={inputClass}><option value="IMPORTANTE">Importante</option><option value="URGENTE">Urgente</option></select></div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3"><span className={`text-xs font-semibold ${alertaOperativa ? 'text-red-700' : 'text-primary-700/60'}`}>{alertaOperativa ? 'Alerta activa en portería' : 'Sin alerta activa'}</span><div className="flex gap-2">{alertaOperativa && <button type="button" onClick={resolverAlerta} disabled={alertaGuardando} className="px-3 py-2 text-sm rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Marcar resuelta</button>}<button type="button" onClick={guardarAlerta} disabled={alertaGuardando || !alertaForm.mensaje.trim()} className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{alertaGuardando ? 'Guardando...' : alertaOperativa ? 'Actualizar alerta' : 'Activar alerta'}</button></div></div>
                </div>
              )}
            </div>
          )}

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

      {/* ==================== MODAL RETIRAR ALUMNO ==================== */}
      <Modal isOpen={retiroModalOpen} onClose={() => !retiroGuardando && setRetiroModalOpen(false)} title="Retirar alumno" size="lg">
        {retiroLoading ? (
          <div className="py-10"><LoadingSpinner /></div>
        ) : retiroInfo ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-primary-800">{retiroInfo.alumno.nombre_completo}</p>
              <p className="text-sm text-primary-700">{retiroInfo.alumno.codigo_alumno} · {retiroInfo.alumno.aula}</p>
              <p className="mt-2 text-xs text-amber-800">
                El historial académico, de asistencia, pagos y deuda no se eliminará.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Fecha efectiva de retiro *</label>
                <input type="date" className={inputClass} value={retiroForm.fecha_retiro}
                  onChange={e => setRetiroForm({ ...retiroForm, fecha_retiro: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Último concepto que sí corresponde cobrar *</label>
                <select className={inputClass} value={retiroForm.ultima_clave_cobro}
                  onChange={e => setRetiroForm({ ...retiroForm, ultima_clave_cobro: e.target.value })}>
                  {(retiroInfo.conceptos || []).map(concepto => (
                    <option key={concepto.clave} value={concepto.clave}>{concepto.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Motivo *</label>
                <select className={inputClass} value={retiroForm.motivo_retiro}
                  onChange={e => setRetiroForm({ ...retiroForm, motivo_retiro: e.target.value })}>
                  <option>Razones económicas</option>
                  <option>Traslado a otra institución</option>
                  <option>Salud</option>
                  <option>Decisión familiar</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Observación adicional</label>
                <input className={inputClass} value={retiroForm.observacion_retiro}
                  onChange={e => setRetiroForm({ ...retiroForm, observacion_retiro: e.target.value })}
                  placeholder="Detalle opcional" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="text-xs text-red-700">Deuda que se conservará</p>
                <p className="text-xl font-semibold text-red-700">S/. {deudaConservada.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                <p className="text-xs text-sky-700">Conceptos posteriores anulados</p>
                <p className="text-xl font-semibold text-sky-700">{conceptosAnulados.length}</p>
              </div>
            </div>

            {conceptosAnulados.length > 0 && (
              <div>
                <p className="text-sm font-medium text-primary-800 mb-2">Quedarán como “No corresponde”:</p>
                <div className="flex flex-wrap gap-2">
                  {conceptosAnulados.map(c => <span key={c.clave} className="px-2.5 py-1 text-xs rounded-full bg-cream-100 text-primary-700">{c.nombre}</span>)}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" disabled={retiroGuardando} onClick={() => setRetiroModalOpen(false)}
                className="px-4 py-2 text-sm bg-cream-100 text-primary-700 rounded-lg hover:bg-cream-200">Cancelar</button>
              <button type="button" disabled={retiroGuardando} onClick={confirmarRetiro}
                className="px-4 py-2 text-sm text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-60">
                {retiroGuardando ? 'Procesando...' : 'Confirmar retiro'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={reactivacionOpen} onClose={() => !reactivacionGuardando && setReactivacionOpen(false)} title="Reactivar y liquidar reincorporación" size="lg">
        {reactivacionLoading ? <div className="py-10"><LoadingSpinner /></div> : reactivacionInfo ? <div className="space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-primary-800">{reactivacionInfo.alumno.nombre_completo}</p><p className="text-sm text-primary-700">{reactivacionInfo.alumno.codigo_alumno} · {reactivacionInfo.alumno.aula}</p><p className="mt-2 text-xs text-emerald-800">Retirada desde {String(reactivacionInfo.alumno.fecha_retiro || '').slice(0, 10)}. Su historial y deuda anterior se conservarán.</p></div>
          <div className="grid gap-4 md:grid-cols-2"><div><label className={labelClass}>Fecha efectiva de retorno *</label><input type="date" className={inputClass} value={reactivacionForm.fecha_reingreso} onChange={e => setReactivacionForm({ ...reactivacionForm, fecha_reingreso: e.target.value })} /></div><div><label className={labelClass}>Primer concepto que vuelve a cobrarse *</label><select className={inputClass} value={reactivacionForm.primera_clave_cobro} onChange={e => setReactivacionForm({ ...reactivacionForm, primera_clave_cobro: e.target.value })}>{(reactivacionInfo.conceptos || []).map(c => <option key={c.clave} value={c.clave}>{c.nombre} · S/. {Number(c.monto_total || 0).toFixed(2)}</option>)}</select></div></div>
          <div><label className={labelClass}>Observación de reincorporación</label><input className={inputClass} value={reactivacionForm.observacion_reingreso} onChange={e => setReactivacionForm({ ...reactivacionForm, observacion_reingreso: e.target.value })} placeholder="Ej.: Retorna por decisión familiar" /></div>
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-red-100 bg-red-50 p-3"><p className="text-xs text-red-700">Deuda anterior pendiente</p><p className="text-xl font-bold text-red-700">S/. {deudaHistoricaReactivacion.toFixed(2)}</p></div><div className="rounded-lg border border-amber-100 bg-amber-50 p-3"><p className="text-xs text-amber-700">Primer cobro de retorno</p><p className="text-xl font-bold text-amber-700">S/. {cobroReingreso.toFixed(2)}</p><p className="text-xs text-amber-700">{conceptoReingreso?.nombre || '-'}</p></div><div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Total informado hoy</p><p className="text-xl font-bold text-emerald-700">S/. {(deudaHistoricaReactivacion + cobroReingreso).toFixed(2)}</p></div></div>
          <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">Los conceptos anteriores al periodo seleccionado permanecerán como “No corresponde”. Los conceptos desde ese periodo volverán a quedar habilitados; solo aparecerán en Cobranzas cuando estén vencidos.</p>
          <div className="flex justify-end gap-3"><button type="button" disabled={reactivacionGuardando} onClick={() => setReactivacionOpen(false)} className="px-4 py-2 text-sm bg-cream-100 text-primary-700 rounded-lg">Cancelar</button><button type="button" disabled={reactivacionGuardando} onClick={confirmarReactivacion} className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60">{reactivacionGuardando ? 'Procesando...' : 'Confirmar reactivación'}</button></div>
        </div> : null}
      </Modal>

      {/* ==================== MODAL CONFIRMAR ELIMINACION ==================== */}
      <Modal isOpen={deleteModalOpen} onClose={() => !eliminandoPermanentemente && setDeleteModalOpen(false)} title={usuario?.rol_codigo === 'SUPER_ADMIN' ? 'Eliminar alumno permanentemente' : 'Eliminar alumno'} size="lg">
        {usuario?.rol_codigo === 'SUPER_ADMIN' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-bold">Esta acción es irreversible.</p>
              <p>Se eliminará únicamente a <strong>{alumnoAEliminar?.nombre_completo}</strong> ({alumnoAEliminar?.codigo_alumno}) y sus registros exclusivos. El apoderado, sus credenciales y otros alumnos se conservarán.</p>
            </div>
            {cargandoEliminacion ? <div className="py-8"><LoadingSpinner /></div> : inventarioEliminacion ? <>
              <div className="rounded-lg border border-cream-200 p-4">
                <p className="mb-2 text-sm font-semibold text-primary-800">Inventario previo</p>
                {inventarioEliminacion.registros.length ? <ul className="space-y-1 text-sm text-primary-800/75">
                  {inventarioEliminacion.registros.map((item) => <li key={item.nombre} className="flex justify-between gap-4"><span>{item.nombre}</span><strong>{item.cantidad}</strong></li>)}
                </ul> : <p className="text-sm text-primary-800/60">No se encontraron registros dependientes.</p>}
                <div className="mt-3 border-t border-cream-200 pt-3 text-xs text-emerald-800">
                  Se conservarán: {inventarioEliminacion.conserva.apoderado ? 'apoderado y credenciales' : 'no existe apoderado vinculado'}; otros alumnos del apoderado: {inventarioEliminacion.conserva.otros_alumnos_apoderado}.
                </div>
              </div>
              {inventarioEliminacion.relaciones_no_contempladas?.length > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Operación bloqueada por relaciones no contempladas: {inventarioEliminacion.relaciones_no_contempladas.join(', ')}.</p>}
              <div><label className={labelClass}>Motivo de la eliminación *</label><textarea className={inputClass} rows="2" maxLength="500" value={confirmacionEliminacion.motivo} onChange={(e) => setConfirmacionEliminacion({ ...confirmacionEliminacion, motivo: e.target.value })} placeholder="Ej.: registro de prueba creado por error" /></div>
              <div><label className={labelClass}>Escriba el código exacto: {alumnoAEliminar?.codigo_alumno}</label><input className={inputClass} value={confirmacionEliminacion.codigo} onChange={(e) => setConfirmacionEliminacion({ ...confirmacionEliminacion, codigo: e.target.value })} autoComplete="off" /></div>
              <div><label className={labelClass}>Confirme su contraseña de Super Admin</label><input type="password" className={inputClass} value={confirmacionEliminacion.contrasena} onChange={(e) => setConfirmacionEliminacion({ ...confirmacionEliminacion, contrasena: e.target.value })} autoComplete="current-password" /></div>
              <div className="flex justify-end gap-3"><button type="button" disabled={eliminandoPermanentemente} onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 text-sm bg-cream-100 text-primary-800 rounded-lg">Cancelar</button><button type="button" disabled={eliminandoPermanentemente || inventarioEliminacion.relaciones_no_contempladas?.length > 0 || confirmacionEliminacion.codigo !== alumnoAEliminar?.codigo_alumno || confirmacionEliminacion.motivo.trim().length < 10 || !confirmacionEliminacion.contrasena} onClick={handleEliminarPermanentemente} className="px-4 py-2 text-sm text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-50">{eliminandoPermanentemente ? 'Eliminando...' : 'Eliminar permanentemente'}</button></div>
            </> : null}
          </div>
        ) : (
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
        )}
      </Modal>

      {/* ==================== MODAL CARNET ==================== */}
      <Modal isOpen={carnetModalOpen} onClose={() => setCarnetModalOpen(false)} title="Carnet del Alumno" size="sm">
        {carnetLoading ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : carnetData ? (
          <div>
            <div className="flex justify-center">
              <CarnetCard key={`${carnetData.alumno.id}-${carnetData.alumno.foto_url || 'sin-foto'}`} alumno={carnetData.alumno} carnet={carnetData.carnet} carnetRef={carnetRef} />
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



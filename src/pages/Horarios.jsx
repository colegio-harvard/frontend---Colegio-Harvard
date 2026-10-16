import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  HiAcademicCap,
  HiArchive,
  HiCheckCircle,
  HiClock,
  HiEye,
  HiPencil,
  HiPlus,
  HiTrash,
} from "react-icons/hi";
import * as horarios from "../services/horariosService";
import {
  listarAños,
  listarNiveles,
  listarGrados,
  listarAulas,
} from "../services/configEscolarService";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Badge from "../components/ui/Badge";
import DataTable from "../components/ui/DataTable";
import ClaseModal from "../components/horarios/ClaseModal";
import ClaseHorarioCell from "../components/horarios/ClaseHorarioCell";
import HorarioImprimible from "../components/horarios/HorarioImprimible";
import HorarioExportActions from "../components/horarios/HorarioExportActions";

const dias = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
const nombreDia = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
};
const error = (e) =>
  e.response?.data?.error || "No se pudo completar la operación";
const estadoBadge = (estado) =>
  ({
    BORRADOR: "default",
    VALIDADO: "info",
    PUBLICADO: "success",
    ARCHIVADO: "warning",
  })[estado] || "default";
const hora = (valor) => {
  const coincidencia = String(valor ?? "").match(/(?:T|^)(\d{2}:\d{2})(?::\d{2})?/);
  return coincidencia?.[1] || "";
};
const nombreVisibleBloque = (bloque) => {
  const normalizar = (valor) => String(valor ?? "").trim().replace(/[–—]/g, "-").replace(/\s+/g, " ");
  const rango = `${hora(bloque.hora_inicio)} - ${hora(bloque.hora_fin)}`;
  return normalizar(bloque.nombre) === normalizar(rango) ? "" : bloque.nombre;
};
const archivoHorario = ({ nivel, grado, seccion, anio }) => `Horario_${[nivel, grado, seccion, anio].filter(Boolean).join("_").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "")}`;

function Campo({ label, children }) {
  return (
    <label className="block text-sm font-medium text-primary-800">
      {label}
      {children}
    </label>
  );
}

function BloquesModal({ open, onClose, datos, onChanged }) {
  const [bloques, setBloques] = useState([]);
  const [form, setForm] = useState({
    id_anio_escolar: "",
    id_nivel: "",
    nombre: "",
    hora_inicio: "",
    hora_fin: "",
    orden: "",
    tipo: "CLASE",
  });
  const [editing, setEditing] = useState(null);
  const cargar = async () => {
    if (!form.id_anio_escolar || !form.id_nivel) return setBloques([]);
    try {
      setBloques(
        (
          await horarios.listarBloques({
            id_anio_escolar: form.id_anio_escolar,
            id_nivel: form.id_nivel,
            incluir_inactivos: true,
          })
        ).data.data || [],
      );
    } catch (e) {
      toast.error(error(e));
    }
  };
  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        id_anio_escolar: datos.anios[0]?.id || "",
        id_nivel: datos.niveles[0]?.id || "",
      }));
    }
  }, [open]);
  useEffect(() => {
    if (open) cargar();
  }, [open, form.id_anio_escolar, form.id_nivel]);
  const guardar = async (e) => {
    e.preventDefault();
    if (
      !form.nombre ||
      !form.hora_inicio ||
      !form.hora_fin ||
      !form.orden ||
      form.hora_fin <= form.hora_inicio
    )
      return toast.error("Revise los campos y el rango horario.");
    try {
      if (editing) await horarios.actualizarBloque(editing, form);
      else await horarios.crearBloque(form);
      toast.success("Bloque guardado");
      setEditing(null);
      setForm((f) => ({
        ...f,
        nombre: "",
        hora_inicio: "",
        hora_fin: "",
        orden: "",
        tipo: "CLASE",
      }));
      cargar();
      onChanged();
    } catch (e2) {
      toast.error(error(e2));
    }
  };
  const editar = (b) => {
    setEditing(b.id);
    setForm({
      id_anio_escolar: b.id_anio_escolar,
      id_nivel: b.id_nivel,
      nombre: b.nombre,
      hora_inicio: hora(b.hora_inicio),
      hora_fin: hora(b.hora_fin),
      orden: b.orden,
      tipo: b.tipo,
    });
  };
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Configurar bloques horarios"
      size="xl"
    >
      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <Campo label="Año escolar">
          <select
            className="input-field mt-1"
            value={form.id_anio_escolar}
            onChange={(e) =>
              setForm({ ...form, id_anio_escolar: e.target.value })
            }
          >
            <option value="">Seleccione</option>
            {datos.anios.map((x) => (
              <option key={x.id} value={x.id}>
                {x.anio}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Nivel">
          <select
            className="input-field mt-1"
            value={form.id_nivel}
            onChange={(e) => setForm({ ...form, id_nivel: e.target.value })}
          >
            <option value="">Seleccione</option>
            {datos.niveles.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="space-y-2 mb-5">
        {bloques.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between rounded-lg border border-cream-200 p-3"
          >
            <span>
              <b>
                {hora(b.hora_inicio)} - {hora(b.hora_fin)}
              </b>
              {nombreVisibleBloque(b) && <> · {nombreVisibleBloque(b)}</>}
            </span>
            <span className="flex gap-2 items-center">
              <Badge variant={b.tipo === "RECREO" ? "warning" : "info"}>
                {b.tipo}
              </Badge>
              {!b.activo && <Badge variant="danger">Inactivo</Badge>}
              <button className="text-gold-700" onClick={() => editar(b)}>
                <HiPencil />
              </button>
              {b.activo && (
                <button
                  className="text-primary-600"
                  onClick={async () => {
                    if (confirm(`¿Desactivar ${b.nombre}?`)) {
                      await horarios.desactivarBloque(b.id);
                      cargar();
                    }
                  }}
                >
                  <HiArchive />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      <form
        onSubmit={guardar}
        className="border-t border-cream-200 pt-4 grid md:grid-cols-3 gap-3"
      >
        <Campo label="Nombre">
          <input
            className="input-field mt-1"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </Campo>
        <Campo label="Inicio">
          <input
            type="time"
            className="input-field mt-1"
            value={form.hora_inicio}
            onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
          />
        </Campo>
        <Campo label="Fin">
          <input
            type="time"
            className="input-field mt-1"
            value={form.hora_fin}
            onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
          />
        </Campo>
        <Campo label="Orden">
          <input
            type="number"
            min="1"
            className="input-field mt-1"
            value={form.orden}
            onChange={(e) => setForm({ ...form, orden: e.target.value })}
          />
        </Campo>
        <Campo label="Tipo">
          <select
            className="input-field mt-1"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          >
            {["CLASE", "RECREO", "OTRO"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Campo>
        <div className="flex items-end gap-2">
          <button className="btn-primary">
            {editing ? "Guardar cambios" : "Crear bloque"}
          </button>
          {editing && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function ClaseModalAnterior({
  open,
  onClose,
  horario,
  celda,
  detalle,
  asignaciones,
  onSaved,
  onDeleted,
}) {
  const [form, setForm] = useState({
    id_asignacion_academica: "",
    observacion: "",
  });
  useEffect(
    () =>
      setForm({
        id_asignacion_academica: detalle?.id_asignacion_academica || "",
        observacion: detalle?.observacion || "",
      }),
    [detalle, open],
  );
  if (!celda) return null;
  const guardar = async (e) => {
    e.preventDefault();
    if (!form.id_asignacion_academica)
      return toast.error("Seleccione una asignación académica.");
    try {
      const data = {
        ...form,
        dia_semana: celda.dia,
        id_bloque_horario: celda.bloque.id,
      };
      if (detalle) await horarios.modificarClase(horario.id, detalle.id, data);
      else await horarios.agregarClase(horario.id, data);
      toast.success("Clase guardada");
      onSaved();
    } catch (x) {
      toast.error(error(x));
    }
  };
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={detalle ? "Editar clase" : "Agregar clase"}
    >
      <form onSubmit={guardar} className="space-y-4">
        <div className="rounded-lg bg-cream-50 p-3 text-sm">
          <b>{nombreDia[celda.dia]}</b> · {celda.bloque.nombre} ·{" "}
          {hora(celda.bloque.hora_inicio)} - {hora(celda.bloque.hora_fin)}
        </div>
        <Campo label="Asignación académica">
          <select
            className="input-field mt-1"
            value={form.id_asignacion_academica}
            onChange={(e) =>
              setForm({ ...form, id_asignacion_academica: e.target.value })
            }
          >
            <option value="">Seleccione</option>
            {asignaciones.map((a) => (
              <option key={a.id} value={a.id}>
                {a.curso} — {a.docente}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Observación">
          <textarea
            className="input-field mt-1"
            value={form.observacion}
            onChange={(e) => setForm({ ...form, observacion: e.target.value })}
          />
        </Campo>
        <div className="flex justify-between">
          <button
            type="button"
            className="text-primary-600"
            onClick={() => detalle && onDeleted(detalle)}
          >
            Eliminar clase
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary">Guardar cambios</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function CargaHoraria({ horario, recargar }) {
  const [carga, setCarga] = useState([]);
  const [editando, setEditando] = useState({});
  const cargar = async () => {
    if (!horario?.id) return;
    try {
      setCarga(
        (await horarios.obtenerCargaHoraria(horario.id)).data.data || [],
      );
    } catch (e) {
      toast.error(error(e));
    }
  };
  useEffect(() => {
    cargar();
  }, [horario?.id, horario?.actualizado_en]);
  const guardar = async (item) => {
    const valor = Number(editando[item.id_asignacion_academica]);
    if (!Number.isInteger(valor) || valor < 1 || valor > 60)
      return toast.error("Ingrese entre 1 y 60 bloques semanales.");
    try {
      await horarios.actualizarCargaHoraria(
        item.id_asignacion_academica,
        valor,
      );
      toast.success("Carga semanal actualizada");
      cargar();
      recargar?.();
    } catch (e) {
      toast.error(error(e));
    }
  };
  const variantes = {
    COMPLETO: "success",
    FALTANTE: "warning",
    EXCEDIDO: "danger",
    SIN_CONFIGURAR: "default",
  };
  return (
    <section className="mt-5 border-t border-cream-200 pt-5">
      <h3 className="font-display text-lg text-primary-800">
        Carga horaria semanal
      </h3>
      <p className="text-sm text-primary-700/65 mb-3">
        Cada clase cuenta como un bloque pedagógico. La carga incompleta es una
        advertencia, no bloquea la publicación.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-cream-50 text-left">
              <th className="p-2">Curso</th>
              <th className="p-2">Docente</th>
              <th className="p-2">Requeridas</th>
              <th className="p-2">Asignadas</th>
              <th className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {carga.map((x) => (
              <tr
                key={x.id_asignacion_academica}
                className="border-b border-cream-100"
              >
                <td className="p-2 font-medium">{x.curso}</td>
                <td className="p-2">{x.docente}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <input
                      aria-label={`Horas requeridas ${x.curso}`}
                      className="input-field w-20 py-1"
                      type="number"
                      min="1"
                      max="60"
                      placeholder="—"
                      defaultValue={x.requeridas ?? ""}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          [x.id_asignacion_academica]: e.target.value,
                        })
                      }
                    />
                    <button
                      className="text-gold-700 text-xs"
                      onClick={() => guardar(x)}
                    >
                      Guardar
                    </button>
                  </div>
                </td>
                <td className="p-2 font-semibold">{x.asignadas}</td>
                <td className="p-2">
                  <Badge variant={variantes[x.estado]}>
                    {x.estado}
                    {x.diferencia !== null &&
                      ` · ${x.asignadas}/${x.requeridas}`}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DisponibilidadDocente({ open, onClose, datos }) {
  const [docentes, setDocentes] = useState([]),
    [docente, setDocente] = useState(""),
    [anio, setAnio] = useState(""),
    [bloques, setBloques] = useState([]),
    [restricciones, setRestricciones] = useState([]);
  useEffect(() => {
    if (open)
      horarios
        .listarDocentesDisponibilidad()
        .then((r) => setDocentes(r.data.data || []))
        .catch((e) => toast.error(error(e)));
  }, [open]);
  useEffect(() => {
    if (open && anio)
      horarios
        .listarBloques({ id_anio_escolar: anio })
        .then((r) => setBloques(r.data.data || []));
  }, [open, anio]);
  useEffect(() => {
    if (docente && anio)
      horarios
        .obtenerDisponibilidad({ id_docente: docente, id_anio_escolar: anio })
        .then((r) => setRestricciones(r.data.data || []));
  }, [docente, anio]);
  const alternar = async (b, dia) => {
    const base = {
      id_docente: docente,
      id_anio_escolar: anio,
      id_bloque_horario: b.id,
      dia_semana: dia,
    };
    const existe = restricciones.find(
      (x) =>
        Number(x.id_bloque_horario) === Number(b.id) && x.dia_semana === dia,
    );
    try {
      if (existe) await horarios.restaurarDisponibilidad(base);
      else {
        const r = await horarios.guardarIndisponibilidad(base);
        if (r.data.conflictos?.length)
          toast("Advertencia: existen clases asignadas en este bloque.");
      }
      setRestricciones(
        (
          await horarios.obtenerDisponibilidad({
            id_docente: docente,
            id_anio_escolar: anio,
          })
        ).data.data || [],
      );
    } catch (e) {
      toast.error(error(e));
    }
  };
  const ds = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Disponibilidad docente"
      size="xl"
    >
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <Campo label="Año escolar">
          <select
            className="input-field mt-1"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          >
            <option value="">Seleccione</option>
            {datos.anios.map((x) => (
              <option key={x.id} value={x.id}>
                {x.anio}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Docente">
          <select
            className="input-field mt-1"
            value={docente}
            onChange={(e) => setDocente(e.target.value)}
          >
            <option value="">Seleccione</option>
            {docentes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombres}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {docente && anio && (
        <div className="overflow-x-auto">
          <p className="text-sm text-primary-700/65 mb-2">
            Por defecto todos los bloques están disponibles. Haga clic para
            alternar una restricción.
          </p>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-cream-50">
                <th className="p-2 text-left">Hora</th>
                {ds.map((d) => (
                  <th key={d} className="p-2">
                    {nombreDia[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloques.map((b) => (
                <tr key={b.id} className="border-b border-cream-100">
                  <td className="p-2">
                    {hora(b.hora_inicio)} - {hora(b.hora_fin)}
                  </td>
                  {ds.map((d) => {
                    const no = restricciones.some(
                      (x) =>
                        Number(x.id_bloque_horario) === Number(b.id) &&
                        x.dia_semana === d &&
                        !x.disponible,
                    );
                    return (
                      <td key={d} className="p-2 text-center">
                        {b.tipo === "RECREO" ? (
                          "RECREO"
                        ) : (
                          <button
                            onClick={() => alternar(b, d)}
                            className={`rounded px-3 py-1 ${no ? "bg-red-100 text-primary-700" : "bg-emerald-50 text-emerald-700"}`}
                          >
                            {no ? "NO DISPONIBLE" : "DISPONIBLE"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export default function Horarios() {
  const [datos, setDatos] = useState({
    anios: [],
    niveles: [],
    grados: [],
    aulas: [],
  });
  const [lista, setLista] = useState([]);
  const [filtros, setFiltros] = useState({
    id_anio_escolar: "",
    id_nivel: "",
    id_grado: "",
    id_aula: "",
    estado: "",
  });
  const [loading, setLoading] = useState(true);
  const [crear, setCrear] = useState(false);
  const [bloques, setBloques] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState(false);
  const [actual, setActual] = useState(null);
  const documentoImprimibleRef = useRef(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [celda, setCelda] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [resultado, setResultado] = useState(null);
  const cargar = async () => {
    setLoading(true);
    try {
      const r = await horarios.listarHorarios(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)),
      );
      setLista(r.data.data || []);
    } catch (e) {
      toast.error(error(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    Promise.all([listarAños(), listarNiveles(), listarGrados(), listarAulas()])
      .then(([a, n, g, au]) =>
        setDatos({
          anios: a.data.data || [],
          niveles: n.data.data || [],
          grados: g.data.data || [],
          aulas: au.data.data || [],
        }),
      )
      .catch((e) => toast.error(error(e)));
  }, []);
  useEffect(() => {
    cargar();
  }, [
    filtros.id_anio_escolar,
    filtros.id_nivel,
    filtros.id_grado,
    filtros.id_aula,
    filtros.estado,
  ]);
  const abrir = async (id) => {
    try {
      const h = await horarios.obtenerHorario(id);
      const horario = h.data.data;
      const a = await horarios.listarAsignaciones({
        id_aula: horario.id_aula,
        id_anio_escolar: horario.id_anio_escolar,
      });
      setActual(horario);
      setAsignaciones(a.data.data || []);
    } catch (e) {
      toast.error(error(e));
    }
  };
  useEffect(() => {
    const id = Number(
      new URLSearchParams(window.location.search).get("horario"),
    );
    if (Number.isInteger(id) && id > 0) abrir(id);
  }, []);
  const refrescarActual = () => abrir(actual.id);
  const grados = datos.grados.filter(
    (g) =>
      !filtros.id_nivel ||
      Number(g.id_nivel || g.nivel?.id) === Number(filtros.id_nivel),
  );
  const aulas = datos.aulas.filter(
    (a) =>
      !filtros.id_grado ||
      Number(a.id_grado || a.grado?.id) === Number(filtros.id_grado),
  );
  const encabezadoActual = useMemo(() => {
    if (!actual) return null;
    const listado = lista.find((item) => Number(item.id) === Number(actual.id));
    const aula = datos.aulas.find((item) => Number(item.id) === Number(actual.id_aula));
    const grado = datos.grados.find((item) => Number(item.id) === Number(aula?.id_grado));
    const nivel = datos.niveles.find((item) => Number(item.id) === Number(grado?.id_nivel || actual.id_nivel));
    const anio = datos.anios.find((item) => Number(item.id) === Number(actual.id_anio_escolar));
    return {
      nivel: listado?.nivel || nivel?.nombre || "",
      grado: listado?.grado || grado?.nombre || "",
      seccion: listado?.seccion || aula?.seccion || "",
      anio: listado?.anio || anio?.anio || "",
    };
  }, [actual, datos, lista]);
  const columns = [
    { header: "Año", render: (r) => r.anio },
    { header: "Nivel", render: (r) => r.nivel },
    { header: "Grado", render: (r) => r.grado },
    { header: "Sección", render: (r) => r.seccion },
    {
      header: "Estado",
      render: (r) => <Badge variant={estadoBadge(r.estado)}>{r.estado}</Badge>,
    },
    { header: "Versión", render: (r) => `v${r.version}` },
    {
      header: "Actualizado",
      render: (r) =>
        new Date(r.actualizado_en || r.creado_en).toLocaleString("es-PE"),
    },
    {
      header: "Acciones",
      render: (r) => (
        <div className="flex gap-2">
          <button
            className="text-gold-700"
            onClick={() => abrir(r.id)}
            title="Ver horario"
          >
            <HiEye />
          </button>
          {["BORRADOR", "VALIDADO"].includes(r.estado) && (
            <button
              className="text-emerald-700"
              onClick={async () => {
                try {
                  const x = await horarios.validarHorario(r.id);
                  setResultado(x.data);
                  cargar();
                } catch (e) {
                  toast.error(error(e));
                }
              }}
              title="Validar"
            >
              <HiCheckCircle />
            </button>
          )}
          {r.estado === "VALIDADO" && (
            <button
              className="btn-primary text-xs px-2 py-1"
              onClick={() => setConfirmar({ tipo: "publicar", r })}
            >
              Publicar
            </button>
          )}
          {["PUBLICADO", "VALIDADO", "BORRADOR"].includes(r.estado) && (
            <button
              className="text-primary-600"
              onClick={() => setConfirmar({ tipo: "archivar", r })}
              title="Archivar"
            >
              <HiArchive />
            </button>
          )}
        </div>
      ),
    },
  ];
  const crearHorario = async (e) => {
    e.preventDefault();
    try {
      const r = await horarios.crearHorario({
        id_anio_escolar: filtros.id_anio_escolar,
        id_aula: filtros.id_aula,
      });
      setCrear(false);
      toast.success("Horario borrador creado");
      cargar();
      abrir(r.data.data.id);
    } catch (x) {
      toast.error(error(x));
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="page-title">Horarios Escolares</h1>
          <p className="page-subtitle">
            Organiza las clases por aula, bloque y día.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => setBloques(true)}
          >
            <HiClock />
            Configurar bloques horarios
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setCrear(true)}
          >
            <HiPlus />
            Crear horario
          </button>
        </div>
      </div>
      <div className="card grid md:grid-cols-5 gap-3">
        {[
          ["id_anio_escolar", "Año escolar", datos.anios, "anio"],
          ["id_nivel", "Nivel", datos.niveles, "nombre"],
          ["id_grado", "Grado", grados, "nombre"],
          ["id_aula", "Sección", aulas, "seccion"],
        ].map(([key, label, items, field]) => (
          <Campo key={key} label={label}>
            <select
              className="input-field mt-1"
              value={filtros[key]}
              onChange={(e) =>
                setFiltros({ ...filtros, [key]: e.target.value })
              }
            >
              <option value="">Todos</option>
              {items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x[field]}
                </option>
              ))}
            </select>
          </Campo>
        ))}
        <Campo label="Estado">
          <select
            className="input-field mt-1"
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          >
            <option value="">Todos</option>
            {["BORRADOR", "VALIDADO", "PUBLICADO", "ARCHIVADO"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="card p-0">
        <DataTable
          columns={columns}
          data={lista}
          loading={loading}
          emptyMessage="No hay horarios registrados"
        />
      </div>
      <BloquesModal
        open={bloques}
        onClose={() => setBloques(false)}
        datos={datos}
        onChanged={cargar}
      />
      <Modal
        isOpen={crear}
        onClose={() => setCrear(false)}
        title="Crear horario"
      >
        <form onSubmit={crearHorario} className="space-y-4">
          <p className="text-sm text-primary-700">
            Elija el año, nivel, grado y sección. Se abrirá un borrador para
            editarlo.
          </p>
          <Campo label="Año escolar">
            <select
              required
              className="input-field mt-1"
              value={filtros.id_anio_escolar}
              onChange={(e) =>
                setFiltros({ ...filtros, id_anio_escolar: e.target.value })
              }
            >
              <option value="">Seleccione</option>
              {datos.anios.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.anio}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Nivel">
            <select
              required
              className="input-field mt-1"
              value={filtros.id_nivel}
              onChange={(e) =>
                setFiltros({
                  ...filtros,
                  id_nivel: e.target.value,
                  id_grado: "",
                  id_aula: "",
                })
              }
            >
              <option value="">Seleccione</option>
              {datos.niveles.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Grado">
            <select
              required
              className="input-field mt-1"
              value={filtros.id_grado}
              onChange={(e) =>
                setFiltros({
                  ...filtros,
                  id_grado: e.target.value,
                  id_aula: "",
                })
              }
            >
              <option value="">Seleccione</option>
              {grados.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Sección">
            <select
              required
              className="input-field mt-1"
              value={filtros.id_aula}
              onChange={(e) =>
                setFiltros({ ...filtros, id_aula: e.target.value })
              }
            >
              <option value="">Seleccione</option>
              {aulas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.seccion}
                </option>
              ))}
            </select>
          </Campo>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCrear(false)}
            >
              Cancelar
            </button>
            <button className="btn-primary">Crear borrador</button>
          </div>
        </form>
      </Modal>
      {actual && (
        <Modal
          isOpen
          onClose={() => setActual(null)}
          title={`${[encabezadoActual?.nivel, encabezadoActual?.grado, encabezadoActual?.seccion].filter(Boolean).join(" ")} · Año escolar ${encabezadoActual?.anio || ""}`}
          size="full"
        >
          <div className="flex justify-between mb-4">
            <Badge variant={estadoBadge(actual.estado)}>{actual.estado}</Badge>
            <div className="flex gap-2">
              {["VALIDADO", "PUBLICADO"].includes(actual.estado) && (
                <HorarioExportActions
                  documentRef={documentoImprimibleRef}
                  archivoBase={archivoHorario(encabezadoActual || {})}
                />
              )}
              {["BORRADOR", "VALIDADO"].includes(actual.estado) && (
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    const x = await horarios.validarHorario(actual.id);
                    setResultado(x.data);
                    refrescarActual();
                    cargar();
                  }}
                >
                  Validar horario
                </button>
              )}
              {actual.estado === "VALIDADO" && (
                <button
                  className="btn-primary"
                  onClick={() => setConfirmar({ tipo: "publicar", r: actual })}
                >
                  Publicar
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left bg-cream-100">Hora</th>
                  {dias.map((d) => (
                    <th key={d} className="p-3 bg-cream-100">
                      {nombreDia[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actual.bloques.map((b) => (
                  <tr key={b.id} className="border-b border-cream-200">
                    <td className="p-3 text-sm whitespace-nowrap">
                      <b>
                        {hora(b.hora_inicio)} - {hora(b.hora_fin)}
                      </b>
                      {nombreVisibleBloque(b) && <><br />{nombreVisibleBloque(b)}</>}
                    </td>
                    {dias.map((d) => {
                      const x = actual.detalles.find(
                        (q) =>
                          q.dia_semana === d &&
                          Number(q.id_bloque_horario) === Number(b.id),
                      );
                      const recreo = b.tipo === "RECREO";
                      const institucional = b.tipo === "OTRO";
                      const bloqueNoAcademico = recreo || institucional;
                      return (
                        <td
                          key={d}
                          className={`min-w-40 p-2 border-l border-cream-200 ${recreo ? "bg-amber-50 text-amber-700 text-center font-semibold" : institucional ? "bg-slate-50 text-slate-700 text-center font-semibold" : "hover:bg-gold-50 cursor-pointer"}`}
                          onClick={() =>
                            !bloqueNoAcademico &&
                            !["PUBLICADO", "ARCHIVADO"].includes(
                              actual.estado,
                            ) &&
                            setCelda({ dia: d, bloque: b })
                          }
                        >
                          {recreo ? (
                            "RECREO"
                          ) : institucional ? (
                            <span className="text-sm">{nombreVisibleBloque(b) || b.nombre}</span>
                          ) : x ? (
                            <ClaseHorarioCell
                              clase={x}
                              onOpen={(e) => {
                                e.stopPropagation();
                                setCelda({ dia: d, bloque: b });
                                setDetalle(x);
                              }}
                            />
                          ) : (
                            <span className="text-cream-400 text-sm">
                              + Agregar clase
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CargaHoraria horario={actual} recargar={refrescarActual} />
          {["VALIDADO", "PUBLICADO"].includes(actual.estado) && (
            <HorarioImprimible
              ref={documentoImprimibleRef}
              className="horario-documento--origen"
              encabezado={encabezadoActual || {}}
              bloques={actual.bloques || []}
              clases={actual.detalles || []}
            />
          )}
        </Modal>
      )}
      <ClaseModal
        open={!!celda}
        onClose={() => {
          setCelda(null);
          setDetalle(null);
        }}
        horario={actual}
        celda={celda}
        detalle={detalle}
        asignaciones={asignaciones}
        onSaved={() => {
          setCelda(null);
          setDetalle(null);
          refrescarActual();
          cargar();
        }}
        onDeleted={(x) => setConfirmar({ tipo: "eliminar", r: x })}
      />
      <Modal
        isOpen={!!resultado}
        onClose={() => setResultado(null)}
        title="Resultado de validación"
      >
        <h3
          className={
            resultado?.valido
              ? "text-emerald-700 font-bold"
              : "text-primary-700 font-bold"
          }
        >
          {resultado?.valido ? "HORARIO VÁLIDO" : "Se encontraron conflictos"}
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {resultado?.errores?.map((x, i) => (
            <li key={i}>⚠ {x.mensaje}</li>
          ))}
          {resultado?.advertencias?.map((x, i) => (
            <li key={i}>ℹ {x.mensaje}</li>
          ))}
          {resultado?.valido && !resultado?.advertencias?.length && (
            <li>✓ Sin conflictos de docentes, sección ni recreos.</li>
          )}
        </ul>
      </Modal>
      <ConfirmDialog
        isOpen={!!confirmar}
        onClose={() => setConfirmar(null)}
        title={
          confirmar?.tipo === "publicar"
            ? "Publicar horario"
            : "Confirmar acción"
        }
        message={
          confirmar?.tipo === "publicar"
            ? `¿Deseas publicar el horario de ${confirmar?.r?.grado} ${confirmar?.r?.seccion}? Podrá ser consultado posteriormente por los padres.`
            : confirmar?.tipo === "archivar"
              ? "El horario dejará de considerarse vigente. Los datos no serán eliminados."
              : "¿Deseas eliminar esta clase?"
        }
        confirmText={
          confirmar?.tipo === "publicar"
            ? "Publicar"
            : confirmar?.tipo === "archivar"
              ? "Archivar"
              : "Eliminar"
        }
        variant={confirmar?.tipo === "publicar" ? "primary" : "danger"}
        onConfirm={async () => {
          try {
            if (confirmar.tipo === "publicar")
              await horarios.publicarHorario(confirmar.r.id);
            else if (confirmar.tipo === "archivar")
              await horarios.archivarHorario(confirmar.r.id);
            else await horarios.eliminarClase(actual.id, confirmar.r.id);
            toast.success("Operación realizada");
            setConfirmar(null);
            refrescarActual();
            cargar();
          } catch (e) {
            toast.error(error(e));
          }
        }}
      />
    </div>
  );
}

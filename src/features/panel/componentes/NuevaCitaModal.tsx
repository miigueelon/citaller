import { useMemo, useState, type ChangeEvent } from "react";
import { useTaller } from "@/app/providers/useTaller";
import { Alerta } from "@/components/Alerta";
import { Modal } from "@/components/Modal";
import { camposDelServicio } from "@/features/taller/api";
import { estaCompleta, festivoDelDia, tallerAbre } from "@/features/reservar/disponibilidad";
import { CamposExtra } from "@/features/reservar/pasos/CamposExtra";
import { useDisponibilidad } from "@/features/reservar/useDisponibilidad";
import { campoValido, esMatriculaValida, esTelefonoValido, normalizarMatricula } from "@/features/reservar/validacion";
import { diaSemana, hoy, sumarDias } from "@/lib/fechas";
import type { DatosCitaManual, ResultadoAccion } from "../useReservasTaller";

interface Props {
  ocupado: boolean;
  onGuardar: (datos: DatosCitaManual) => Promise<ResultadoAccion>;
  onCerrar: () => void;
}

const VACIA: DatosCitaManual = { nombre: "", telefono: "", matricula: "", vehiculo: "", servicio: "", descripcion: "", dia: "", hora: "", datos_extra: {} };

/**
 * Cita apuntada a mano desde el panel (cliente en el mostrador o por teléfono). Nace confirmada.
 * El teléfono es opcional; el taller puede elegir cualquier hora: si está fuera del horario o
 * llena, se avisa pero no se bloquea.
 */
export function NuevaCitaModal({ ocupado, onGuardar, onCerrar }: Props) {
  const taller = useTaller();
  const [datos, setDatos] = useState<DatosCitaManual>(VACIA);
  const [error, setError] = useState<string | null>(null);
  const { horarios, festivos, ocupacion, cargandoOcupacion } = useDisponibilidad(taller.id, datos.dia);

  const servicio = taller.servicios.find((s) => s.nombre === datos.servicio);
  const campos = camposDelServicio(taller.campos, servicio);
  const descripcionObligatoria = servicio?.descripcion_modo === "obligatoria";

  const horasDelDia = useMemo(() => {
    if (!datos.dia) return [];
    const dow = diaSemana(datos.dia);
    return horarios.filter((h) => h.dia_semana === dow).map((h) => h.hora.substring(0, 5)).sort();
  }, [horarios, datos.dia]);

  // Avisos sobre el hueco elegido: informan, no bloquean (decisión del 20-sep).
  const avisosHueco = useMemo(() => {
    const lista: string[] = [];
    if (!datos.dia) return lista;
    const festivo = festivoDelDia(festivos, datos.dia);
    if (festivo) lista.push(`Ese día el taller cierra (${festivo.nombre}).`);
    else if (!tallerAbre(horarios, datos.dia)) lista.push("Ese día el taller no abre según su horario.");
    if (datos.hora) {
      if (!horasDelDia.includes(datos.hora)) lista.push("Esa hora está fuera del horario habitual de recepción.");
      else if (!cargandoOcupacion && estaCompleta(ocupacion, datos.hora, taller.capacidad, taller.modo_capacidad)) {
        lista.push(taller.modo_capacidad === "por_dia" ? "Ese día ya está completo." : "Esa hora ya está completa.");
      }
    }
    return lista;
  }, [datos.dia, datos.hora, festivos, horarios, horasDelDia, ocupacion, cargandoOcupacion, taller.capacidad, taller.modo_capacidad]);

  const errores = {
    matricula: datos.matricula.trim() !== "" && !esMatriculaValida(datos.matricula) ? "Escribe la matrícula sin símbolos, por ejemplo 1234ABC." : undefined,
    telefono: datos.telefono.trim() !== "" && !esTelefonoValido(datos.telefono) ? "Escribe un teléfono español de 9 cifras o déjalo vacío." : undefined,
  };

  const completo =
    datos.nombre.trim() !== "" &&
    datos.matricula.trim() !== "" &&
    datos.vehiculo.trim() !== "" &&
    servicio !== undefined &&
    datos.dia !== "" &&
    datos.hora !== "" &&
    !errores.matricula &&
    !errores.telefono &&
    (!descripcionObligatoria || datos.descripcion.trim() !== "") &&
    campos.every((campo) => campoValido(campo, datos.datos_extra[campo.clave]));

  function cambiar(evento: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = evento.target;
    if (name === "servicio") {
      const generales = Object.fromEntries(Object.entries(datos.datos_extra).filter(([clave]) => taller.campos.some((c) => c.clave === clave && c.servicio_id === null)));
      setDatos({ ...datos, servicio: value, descripcion: "", datos_extra: generales });
      return;
    }
    if (name === "dia") {
      setDatos({ ...datos, dia: value, hora: "" });
      return;
    }
    setDatos({ ...datos, [name]: value });
  }

  async function guardar() {
    if (!completo || ocupado) return;
    setError(null);
    const resultado = await onGuardar({
      ...datos,
      matricula: normalizarMatricula(datos.matricula),
      nombre: datos.nombre.trim(),
      telefono: datos.telefono.trim(),
      vehiculo: datos.vehiculo.trim(),
      descripcion: datos.descripcion.trim(),
    });
    if (!resultado.ok) setError(resultado.avisos[0] ?? "No se pudo guardar la cita.");
    // Si se guardó, el panel cierra este modal y enseña el resultado de las notificaciones.
  }

  return (
    <Modal titulo="Apuntar una cita" textoConfirmar="Guardar cita confirmada" textoCancelar="Cerrar" ocupado={ocupado} onConfirmar={() => void guardar()} onCancelar={onCerrar}>
      <form
        className="nueva-cita-form"
        onSubmit={(evento) => {
          evento.preventDefault();
          void guardar();
        }}
      >
        <p className="nueva-cita-nota">La cita se guarda ya confirmada. Si el cliente tiene teléfono, se le avisa según el modo de WhatsApp del taller.</p>

        <div className="nueva-cita-fila">
          <label>
            Nombre
            <input name="nombre" value={datos.nombre} onChange={cambiar} autoComplete="off" required />
          </label>
          <label>
            Teléfono <span className="nueva-cita-opcional">(opcional)</span>
            <input name="telefono" type="tel" inputMode="tel" value={datos.telefono} onChange={cambiar} autoComplete="off" aria-invalid={errores.telefono ? true : undefined} />
            {errores.telefono && <span className="nueva-cita-error">{errores.telefono}</span>}
          </label>
        </div>

        <div className="nueva-cita-fila">
          <label>
            Matrícula
            <input name="matricula" value={datos.matricula} onChange={cambiar} autoComplete="off" required aria-invalid={errores.matricula ? true : undefined} />
            {errores.matricula && <span className="nueva-cita-error">{errores.matricula}</span>}
          </label>
          <label>
            Vehículo
            <input name="vehiculo" value={datos.vehiculo} onChange={cambiar} autoComplete="off" required />
          </label>
        </div>

        <label>
          Servicio
          <select name="servicio" value={datos.servicio} onChange={cambiar} required>
            <option value="" disabled>
              Selecciona un servicio
            </option>
            {taller.servicios.map((s) => (
              <option key={s.id} value={s.nombre}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>

        <CamposExtra campos={campos} valores={datos.datos_extra} onCambio={(clave, valor) => setDatos({ ...datos, datos_extra: { ...datos.datos_extra, [clave]: valor } })} />

        {servicio && servicio.descripcion_modo !== "oculta" && (
          <label>
            {servicio.descripcion_etiqueta ?? "Descripción"} {descripcionObligatoria ? "" : <span className="nueva-cita-opcional">(opcional)</span>}
            <textarea name="descripcion" value={datos.descripcion} onChange={cambiar} rows={2} maxLength={500} placeholder={servicio.descripcion_placeholder ?? ""} required={descripcionObligatoria} />
          </label>
        )}

        <div className="nueva-cita-fila">
          <label>
            Día
            <input name="dia" type="date" value={datos.dia} onChange={cambiar} min={hoy()} max={sumarDias(hoy(), 90)} required />
          </label>
          <label>
            Hora
            <input name="hora" type="time" list="horas-taller" value={datos.hora} onChange={cambiar} step={900} required disabled={!datos.dia} />
            <datalist id="horas-taller">
              {horasDelDia.map((hora) => (
                <option key={hora} value={hora} />
              ))}
            </datalist>
          </label>
        </div>

        {avisosHueco.length > 0 && (
          <Alerta tipo="aviso">
            {avisosHueco.map((texto) => (
              <p key={texto}>{texto}</p>
            ))}
            <p>Puedes guardarla igualmente: el taller decide.</p>
          </Alerta>
        )}

        {!completo && datos.servicio !== "" && datos.hora !== "" && <p className="nueva-cita-nota">Faltan datos obligatorios o hay algún formato incorrecto.</p>}

        {error && <Alerta tipo="error">{error}</Alerta>}
        {/* El botón de guardar es el del modal; Enter dentro del formulario también guarda. */}
        <button type="submit" hidden disabled={!completo || ocupado} />
      </form>
    </Modal>
  );
}

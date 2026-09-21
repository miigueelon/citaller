import type { ChangeEvent } from "react";
import { Clock, MapPin, Phone, Star } from "lucide-react";
import CampoInput from "@/components/CampoInput";
import { FirmaCiTaller } from "@/components/FirmaCiTaller";
import { useTaller } from "@/app/providers/useTaller";
import { camposDelServicio } from "@/features/taller/api";
import type { ReservaEnCurso } from "../tipos";
import { erroresDeFormato, formularioCompleto } from "../validacion";
import { CamposExtra } from "./CamposExtra";

interface Props {
  reserva: ReservaEnCurso;
  actualizar: (cambios: Partial<ReservaEnCurso>) => void;
  continuar: () => void;
}

/** Paso 1: datos del cliente y del vehículo, y servicio, con los campos que el taller haya configurado. */
export function DatosForm({ reserva, actualizar, continuar }: Props) {
  const taller = useTaller();
  const servicio = taller.servicios.find((s) => s.nombre === reserva.servicio);
  const campos = camposDelServicio(taller.campos, servicio);

  function alCambiar(evento: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = evento.target;
    // Al cambiar de servicio se limpian la descripción y los campos que dependen de él.
    if (name === "servicio") {
      const nuevoServicio = taller.servicios.find((s) => s.nombre === value);
      const generales = Object.fromEntries(
        Object.entries(reserva.datos_extra).filter(([clave]) => taller.campos.some((c) => c.clave === clave && c.servicio_id === null)),
      );
      actualizar({ servicio: nuevoServicio?.nombre ?? "", descripcion: "", datos_extra: generales });
      return;
    }
    actualizar({ [name]: value } as Partial<ReservaEnCurso>);
  }

  function alCambiarExtra(clave: string, valor: string) {
    actualizar({ datos_extra: { ...reserva.datos_extra, [clave]: valor } });
  }

  const errores = erroresDeFormato(reserva);
  const completo = formularioCompleto(reserva, { servicio, campos });
  const mostrarDescripcion = servicio !== undefined && servicio.descripcion_modo !== "oculta";
  const descripcionObligatoria = servicio?.descripcion_modo === "obligatoria";
  const camposGenerales = campos.filter((c) => c.servicio_id === null);
  const camposDelServicioElegido = campos.filter((c) => c.servicio_id !== null);

  return (
    <div className="container">
      <div className="card">
        <p className="eyebrow">Reserva tu cita en</p>

        <h1>{taller.nombre}</h1>

        <ul className="taller-datos">
          {(taller.direccion || taller.ciudad) && (
            <li>
              <MapPin aria-hidden="true" />
              {taller.direccion ? taller.direccion : taller.ciudad}
            </li>
          )}

          {taller.horario_texto && (
            <li>
              <Clock aria-hidden="true" />
              {taller.horario_texto}
            </li>
          )}

          {taller.telefono && (
            <li>
              <Phone aria-hidden="true" />
              <a href={`tel:${taller.telefono}`}>{taller.telefono}</a>
            </li>
          )}

          {taller.valoracion != null && (
            <li>
              <Star aria-hidden="true" />
              {Number(taller.valoracion).toFixed(1)}
              {(taller.numero_resenas ?? 0) > 0 ? ` · ${taller.numero_resenas} reseñas` : ""}
            </li>
          )}
        </ul>

        <form className="formulario-reserva">
          <div className="fila">
            <div className="campo">
              <CampoInput label="Matrícula" name="matricula" value={reserva.matricula} onChange={alCambiar} autoComplete="off" error={errores.matricula} />
            </div>

            <div className="campo">
              <CampoInput label="Vehículo" name="vehiculo" value={reserva.vehiculo} onChange={alCambiar} />
            </div>
          </div>

          <div className="fila">
            <div className="campo">
              <CampoInput label="Nombre" name="nombre" value={reserva.nombre} onChange={alCambiar} autoComplete="name" />
            </div>

            <div className="campo">
              <CampoInput label="Teléfono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" value={reserva.telefono} onChange={alCambiar} error={errores.telefono} />
            </div>
          </div>

          <CamposExtra campos={camposGenerales} valores={reserva.datos_extra} onCambio={alCambiarExtra} />

          <label htmlFor="servicio">Servicio</label>

          <select id="servicio" name="servicio" value={reserva.servicio} onChange={alCambiar}>
            <option value="" disabled>
              Selecciona un servicio
            </option>
            {taller.servicios.map((s) => (
              <option key={s.id} value={s.nombre}>
                {s.nombre}
              </option>
            ))}
          </select>

          <CamposExtra campos={camposDelServicioElegido} valores={reserva.datos_extra} onCambio={alCambiarExtra} />

          {mostrarDescripcion && servicio && (
            <div className="descripcion-servicio">
              <label htmlFor="descripcion">
                {servicio.descripcion_etiqueta ?? "Cuéntanos qué necesitas"}
                {descripcionObligatoria ? (
                  <span className="texto-obligatorio">* Obligatorio</span>
                ) : (
                  <span className="texto-opcional"> (opcional)</span>
                )}
              </label>

              <div className="descripcion-wrapper">
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={reserva.descripcion}
                  onChange={alCambiar}
                  maxLength={descripcionObligatoria ? undefined : 250}
                  placeholder={servicio.descripcion_placeholder ?? ""}
                  rows={descripcionObligatoria ? 1 : 4}
                  required={descripcionObligatoria}
                />

                {!descripcionObligatoria && <span className="contador-descripcion">{reserva.descripcion.length}/250</span>}
              </div>

              {servicio.descripcion_ayuda && <p className="ayuda-descripcion">{servicio.descripcion_ayuda}</p>}

              {servicio.imagen_ayuda_url && (
                <div className="guia-imagen">
                  <img src={servicio.imagen_ayuda_url} alt={`Ayuda para ${servicio.nombre}`} />
                </div>
              )}
            </div>
          )}

          <button type="button" className="boton-principal" disabled={!completo} onClick={continuar}>
            CONTINUAR
          </button>
        </form>

        <FirmaCiTaller />
      </div>
    </div>
  );
}

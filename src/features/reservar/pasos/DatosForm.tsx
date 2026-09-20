import type { ChangeEvent } from "react";
import CampoInput from "@/components/CampoInput";
import logo from "@/assets/logo.png";
import guiaNeumatico from "@/assets/guia_neumatico.png";
import { useTaller } from "@/app/providers/useTaller";
import { esNeumaticosConMedidas, tallerPideKilometros } from "@/features/taller/configTemporal";
import type { ReservaEnCurso } from "../tipos";

interface Props {
  reserva: ReservaEnCurso;
  actualizar: (cambios: Partial<ReservaEnCurso>) => void;
  continuar: () => void;
}

/** Paso 1: datos del cliente y del vehículo, y servicio (con los campos propios de cada taller). */
export function DatosForm({ reserva, actualizar, continuar }: Props) {
  const taller = useTaller();

  function alCambiar(evento: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    actualizar({ [evento.target.name]: evento.target.value } as Partial<ReservaEnCurso>);
  }

  // Solo permite números en kilómetros. El campo sigue siendo opcional.
  function alCambiarKilometros(evento: ChangeEvent<HTMLInputElement>) {
    actualizar({ kilometros: evento.target.value.replace(/\D/g, "") });
  }

  const pideKilometros = tallerPideKilometros(reserva.taller_id);
  const neumaticosConMedidas = esNeumaticosConMedidas(reserva.taller_id, reserva.servicio);
  const mostrarDescripcion = reserva.servicio === "Avería / luz de aviso" || reserva.servicio === "Otro" || neumaticosConMedidas;

  const formularioCompleto =
    reserva.matricula.trim() !== "" &&
    reserva.nombre.trim() !== "" &&
    reserva.telefono.trim() !== "" &&
    reserva.vehiculo.trim() !== "" &&
    reserva.servicio !== "" &&
    (!neumaticosConMedidas || (reserva.cantidad_neumaticos !== "" && reserva.descripcion.trim() !== ""));

  return (
    <div className="container">
      <div className="card">
        <div className="volver-card"></div>

        <img src={logo} alt="CiTaller" className="logo" />

        <h1>Reserva tu cita</h1>

        <p className="subtitulo">En menos de un minuto.</p>

        <div className="trust-bar">
          <div className="trust-item">✅ Sin llamadas</div>
          <div className="trust-item">⚡ Reserva enviada al instante</div>
          <div className="trust-item">🕒 Disponible 24/7</div>
        </div>

        <div className="taller-info">
          <h2>🔧 {taller.nombre}</h2>

          {(taller.direccion || taller.ciudad) && <p>📍 {taller.direccion ? taller.direccion : taller.ciudad}</p>}

          {taller.horario_texto && <p>🕒 {taller.horario_texto}</p>}

          {taller.valoracion && (
            <p>
              ⭐ {Number(taller.valoracion).toFixed(1)}
              {(taller.numero_resenas ?? 0) > 0 ? ` · ${taller.numero_resenas} reseñas` : ""}
            </p>
          )}

          {taller.telefono && <p>📞 {taller.telefono}</p>}
        </div>

        <form>
          <div className="fila">
            <div className="campo">
              <CampoInput label="Matrícula" name="matricula" value={reserva.matricula} onChange={alCambiar} />
            </div>

            <div className="campo">
              <CampoInput label="Vehículo" name="vehiculo" value={reserva.vehiculo} onChange={alCambiar} />
            </div>
          </div>

          <div className="fila">
            <div className="campo">
              <CampoInput label="Nombre" name="nombre" value={reserva.nombre} onChange={alCambiar} />
            </div>

            <div className="campo">
              <CampoInput label="Teléfono" name="telefono" type="tel" value={reserva.telefono} onChange={alCambiar} />
            </div>
          </div>

          {pideKilometros && (
            <div className="fila">
              <div className="campo">
                <CampoInput label="Kilómetros (opcional)" name="kilometros" type="text" value={reserva.kilometros} onChange={alCambiarKilometros} />
              </div>
            </div>
          )}

          <label htmlFor="servicio">Servicio</label>

          <select id="servicio" name="servicio" value={reserva.servicio} onChange={alCambiar}>
            <option value="" disabled>
              Selecciona un servicio
            </option>
            <option value="Revisión / mantenimiento">Revisión / mantenimiento</option>
            <option value="Cambio de aceite y filtros">Cambio de aceite y filtros</option>
            <option value="Frenos">Frenos</option>
            <option value="Neumáticos">Neumáticos</option>
            <option value="ITV">ITV</option>
            <option value="Avería / luz de aviso">Avería / luz de aviso</option>
            <option value="Otro">Otro</option>
          </select>

          {neumaticosConMedidas && (
            <div className="descripcion-servicio">
              <label htmlFor="cantidad_neumaticos">¿Cuántos neumáticos quieres cambiar?</label>

              <select id="cantidad_neumaticos" name="cantidad_neumaticos" value={reserva.cantidad_neumaticos} onChange={alCambiar}>
                <option value="" disabled>
                  Selecciona cantidad
                </option>
                <option value="1">1 neumático</option>
                <option value="2">2 neumáticos</option>
                <option value="3">3 neumáticos</option>
                <option value="4">4 neumáticos</option>
              </select>
            </div>
          )}

          {mostrarDescripcion && (
            <div className="descripcion-servicio">
              <label htmlFor="descripcion">
                {neumaticosConMedidas ? "Medidas / observaciones" : reserva.servicio === "Otro" ? "Cuéntanos qué necesitas" : "Cuéntanos qué ocurre"}

                {neumaticosConMedidas ? (
                  <span style={{ color: "#c0392b", marginLeft: 6 }}>* Obligatorio</span>
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
                  maxLength={neumaticosConMedidas ? undefined : 250}
                  placeholder={
                    neumaticosConMedidas
                      ? "Ej.: 225/45 R17 91Y"
                      : reserva.servicio === "Otro"
                        ? "Ej.: Quiero revisar el aire acondicionado..."
                        : "Ej.: Se ha encendido una luz amarilla en el cuadro..."
                  }
                  rows={neumaticosConMedidas ? 1 : 4}
                  required={neumaticosConMedidas}
                />

                {!neumaticosConMedidas && <span className="contador-descripcion">{reserva.descripcion.length}/250</span>}
              </div>

              <p className="ayuda-descripcion">
                {neumaticosConMedidas
                  ? "ⓘ Indica la medida que aparece en el lateral del neumático."
                  : "ⓘ Cuanta más información nos des, mejor podremos ayudarte."}
              </p>

              {neumaticosConMedidas && (
                <div style={{ marginTop: "10px", padding: "10px", border: "1px solid #e5e7eb", borderRadius: "12px", background: "#fff" }}>
                  <img
                    src={guiaNeumatico}
                    alt="Ejemplo de medida de neumático: 205/55 R16 91W, destacada en amarillo en el lateral"
                    style={{ display: "block", width: "100%", maxWidth: "520px", height: "auto", margin: "0 auto", borderRadius: "8px" }}
                  />
                  <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: "13px" }}>
                    Ejemplo: <strong>205/55 R16 91W</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          <button type="button" disabled={!formularioCompleto} onClick={continuar}>
            CONTINUAR
          </button>
        </form>
      </div>
    </div>
  );
}

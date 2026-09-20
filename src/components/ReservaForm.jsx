import { useEffect, useState } from "react";
import CampoInput from "./CampoInput";
import logo from "../assets/logo.png";
import { supabasePublic } from "@/lib/supabase/client";
import guiaNeumatico from "../assets/guia_neumatico.png";

export default function ReservaForm({
  reserva,
  setReserva,
  continuar,
}) {
  const [taller, setTaller] = useState(null);
  const [cargandoTaller, setCargandoTaller] = useState(true);

  // ==========================================
  // CARGAR DATOS DEL TALLER
  // ==========================================

  useEffect(() => {
    async function cargarTaller() {
      if (!reserva.taller_id) {
        setTaller(null);
        setCargandoTaller(false);
        return;
      }

      setCargandoTaller(true);

      const { data, error } = await supabasePublic
        .from("talleres_publicos")
        .select(`
          id,
          nombre,
          telefono,
          direccion,
          ciudad,
          horario_texto,
          valoracion,
          numero_resenas
        `)
        .eq("id", reserva.taller_id)
        .single();

      if (error) {
        console.error(
          "Error cargando datos del taller:",
          error
        );

        setTaller(null);
      } else {
        setTaller(data);
      }

      setCargandoTaller(false);
    }

    cargarTaller();
  }, [reserva.taller_id]);

  // ==========================================
  // ACTUALIZAR FORMULARIO
  // ==========================================

  function actualizar(e) {
    setReserva({
      ...reserva,
      [e.target.name]: e.target.value,
    });
  }

  // Solo permite números en kilómetros.
  // El campo sigue siendo opcional.
  function actualizarKilometros(e) {
    const valor = e.target.value.replace(/\D/g, "");

    setReserva({
      ...reserva,
      kilometros: valor,
    });
  }

  const esNeumaticosRikAndRoll =
    Number(reserva.taller_id) === 2 &&
    reserva.servicio === "Neumáticos";

  const mostrarDescripcion =
    reserva.servicio === "Avería / luz de aviso" ||
    reserva.servicio === "Otro" ||
    esNeumaticosRikAndRoll;

  const formularioCompleto =
    reserva.matricula.trim() !== "" &&
    reserva.nombre.trim() !== "" &&
    reserva.telefono.trim() !== "" &&
    reserva.vehiculo.trim() !== "" &&
    reserva.servicio !== "" &&
    (!esNeumaticosRikAndRoll ||
      String(reserva.cantidad_neumaticos || "") !== "" &&
      String(reserva.descripcion || "").trim() !== "");

  return (
    <div className="container">

      <div className="card">

        <div className="volver-card">

        </div>

        <img
          src={logo}
          alt="CiTaller"
          className="logo"
        />

        <h1>Reserva tu cita</h1>

        <p className="subtitulo">
          En menos de un minuto.
        </p>

        <div className="trust-bar">

          <div className="trust-item">
            ✅ Sin llamadas
          </div>

          <div className="trust-item">
            ⚡ Reserva enviada al instante
          </div>

          <div className="trust-item">
            🕒 Disponible 24/7
          </div>

        </div>

        {/* ======================================
            INFORMACIÓN DEL TALLER
        ====================================== */}

        <div className="taller-info">

          {cargandoTaller ? (

            <p>
              Cargando información del taller...
            </p>

          ) : taller ? (

            <>
              <h2>
                🔧 {taller.nombre}
              </h2>

              {(taller.direccion || taller.ciudad) && (
                <p>
                  📍{" "}
                  {taller.direccion
                    ? taller.direccion
                    : taller.ciudad}
                </p>
              )}

              {taller.horario_texto && (
                <p>
                  🕒 {taller.horario_texto}
                </p>
              )}

              {taller.valoracion && (
                <p>
                  ⭐ {Number(taller.valoracion).toFixed(1)}
                  {taller.numero_resenas > 0
                    ? ` · ${taller.numero_resenas} reseñas`
                    : ""}
                </p>
              )}

              {taller.telefono && (
                <p>
                  📞 {taller.telefono}
                </p>
              )}
            </>

          ) : (

            <p>
              No se pudo cargar la información del taller.
            </p>

          )}

        </div>

        <form>

          {/* FILA 1 */}

          <div className="fila">

            <div className="campo">

              <CampoInput
                label="Matrícula"
                name="matricula"
                value={reserva.matricula}
                onChange={actualizar}
                placeholder="1234ABC"
              />

            </div>

            <div className="campo">

              <CampoInput
                label="Vehículo"
                name="vehiculo"
                value={reserva.vehiculo}
                onChange={actualizar}
                placeholder="Seat León"
              />

            </div>

          </div>

          {/* FILA 2 */}

          <div className="fila">

            <div className="campo">

              <CampoInput
                label="Nombre"
                name="nombre"
                value={reserva.nombre}
                onChange={actualizar}
                placeholder="Miguel Rodríguez"
              />

            </div>

            <div className="campo">

              <CampoInput
                label="Teléfono"
                name="telefono"
                type="tel"
                value={reserva.telefono}
                onChange={actualizar}
                placeholder="600123123"
              />

            </div>

          </div>

          {/* KILÓMETROS - SOLO SPEEDBIKES (TALLER 1) */}

          {Number(reserva.taller_id) === 1 && (

            <div className="fila">

              <div className="campo">

                <CampoInput
                  label="Kilómetros (opcional)"
                  name="kilometros"
                  type="text"
                  inputMode="numeric"
                  value={reserva.kilometros ?? ""}
                  onChange={actualizarKilometros}
                  placeholder="Ej.: 45000"
                />

              </div>

            </div>

          )}

          <label htmlFor="servicio">
            Servicio
          </label>

          <select
            id="servicio"
            name="servicio"
            value={reserva.servicio}
            onChange={actualizar}
          >

            <option value="" disabled>
              Selecciona un servicio
            </option>

            <option value="Revisión / mantenimiento">
              Revisión / mantenimiento
            </option>

            <option value="Cambio de aceite y filtros">
              Cambio de aceite y filtros
            </option>

            <option value="Frenos">
              Frenos
            </option>

            <option value="Neumáticos">
              Neumáticos
            </option>

            <option value="ITV">
              ITV
            </option>

            <option value="Avería / luz de aviso">
              Avería / luz de aviso
            </option>

            <option value="Otro">
              Otro
            </option>

          </select>

          {esNeumaticosRikAndRoll && (
            <div className="descripcion-servicio">
              <label htmlFor="cantidad_neumaticos">
                ¿Cuántos neumáticos quieres cambiar?
              </label>

              <select
                id="cantidad_neumaticos"
                name="cantidad_neumaticos"
                value={reserva.cantidad_neumaticos || ""}
                onChange={actualizar}
              >
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

                {esNeumaticosRikAndRoll
                  ? "Medidas / observaciones"
                  : reserva.servicio === "Otro"
                  ? "Cuéntanos qué necesitas"
                  : "Cuéntanos qué ocurre"}

                {esNeumaticosRikAndRoll ? (
                  <span style={{ color: "#c0392b", marginLeft: 6 }}>
                    * Obligatorio
                  </span>
                ) : (
                  <span className="texto-opcional">{" "} (opcional)</span>
                )}

              </label>

              <div className="descripcion-wrapper">

                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={reserva.descripcion}
                  onChange={actualizar}
                  maxLength={esNeumaticosRikAndRoll ? undefined : 250}
                  placeholder={
                    esNeumaticosRikAndRoll
                      ? "Ej.: 225/45 R17 91Y"
                      : reserva.servicio === "Otro"
                      ? "Ej.: Quiero revisar el aire acondicionado..."
                      : "Ej.: Se ha encendido una luz amarilla en el cuadro..."
                  }
                  rows={esNeumaticosRikAndRoll ? 1 : 4}
                  required={esNeumaticosRikAndRoll}
                />

                {!esNeumaticosRikAndRoll && (
  <span className="contador-descripcion">
    {reserva.descripcion.length}/250
  </span>
)}

              </div>

              <p className="ayuda-descripcion">
                {esNeumaticosRikAndRoll
                  ? "ⓘ Indica la medida que aparece en el lateral del neumático."
                  : "ⓘ Cuanta más información nos des, mejor podremos ayudarte."}
              </p>

              {esNeumaticosRikAndRoll && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    background: "#fff",
                  }}
                >
                  <img
                    src={guiaNeumatico}
                    alt="Ejemplo de medida de neumático: 205/55 R16 91W, destacada en amarillo en el lateral"
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: "520px",
                      height: "auto",
                      margin: "0 auto",
                      borderRadius: "8px",
                    }}
                  />
                  <p
                    style={{
                      margin: "8px 0 0",
                      textAlign: "center",
                      fontSize: "13px",
                    }}
                  >
                    Ejemplo: <strong>205/55 R16 91W</strong>
                  </p>
                </div>
              )}

            </div>

          )}

          <button
            type="button"
            disabled={!formularioCompleto}
            onClick={continuar}
          >
            CONTINUAR
          </button>

        </form>

      </div>

    </div>
  );
}

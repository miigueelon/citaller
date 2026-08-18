import CampoInput from "./CampoInput";
import logo from "../assets/logo.png";

export default function ReservaForm({
  reserva,
  setReserva,
  continuar,
  volver,
}) {

  function actualizar(e) {
    setReserva({
      ...reserva,
      [e.target.name]: e.target.value,
    });
  }

  const mostrarDescripcion =
    reserva.servicio === "Avería / luz de aviso" ||
    reserva.servicio === "Otro";

  const formularioCompleto =
    reserva.matricula.trim() !== "" &&
    reserva.nombre.trim() !== "" &&
    reserva.telefono.trim() !== "" &&
    reserva.vehiculo.trim() !== "" &&
    reserva.servicio !== "";

  return (

    <div className="container">

      <div className="card">

        <div className="volver-card">

          <button
            type="button"
            className="volver-menu"
            onClick={volver}
          >
            ← Volver
          </button>

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

        <div className="taller-info">

          <h2>
            🔧 Taller Demo Premium
          </h2>

          <p>
            📍 Castelldefels · Barcelona
          </p>

          <p>
            🕒 Lunes a Viernes · 08:00 - 19:00
          </p>

          <p>
            ⭐ 4,9 · Más de 120 reseñas
          </p>

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

          {mostrarDescripcion && (

            <div className="descripcion-servicio">

              <label htmlFor="descripcion">

                {reserva.servicio === "Otro"
                  ? "Cuéntanos qué necesitas"
                  : "Cuéntanos qué ocurre"}

                <span className="texto-opcional">
                  {" "} (opcional)
                </span>

              </label>

              <div className="descripcion-wrapper">

                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={reserva.descripcion}
                  onChange={actualizar}
                  maxLength={250}
                  placeholder={
                    reserva.servicio === "Otro"
                      ? "Ej.: Quiero revisar el aire acondicionado..."
                      : "Ej.: Se ha encendido una luz amarilla en el cuadro..."
                  }
                  rows="4"
                />

                <span className="contador-descripcion">
                  {reserva.descripcion.length}/250
                </span>

              </div>

              <p className="ayuda-descripcion">
                ⓘ Cuanta más información nos des, mejor podremos ayudarte.
              </p>

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
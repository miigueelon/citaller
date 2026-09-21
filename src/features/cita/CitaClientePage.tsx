import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Link, useParams } from "react-router";
import { useTaller } from "@/app/providers/useTaller";
import { Alerta } from "@/components/Alerta";
import { FirmaCiTaller } from "@/components/FirmaCiTaller";
import { Modal } from "@/components/Modal";
import { PantallaCargando } from "@/components/PantallaCargando";
import { formatearDiaLargo, horaCorta } from "@/lib/fechas";
import { cancelarCita, consultarCita, esTokenValido, type CitaCliente } from "./api";
import "@/features/reservar/reservar.css";

type Estado = { fase: "cargando" } | { fase: "no_encontrada" } | { fase: "error"; mensaje: string } | { fase: "lista"; cita: CitaCliente };

const ETIQUETA_ESTADO: Record<CitaCliente["estado"], string> = {
  Pendiente: "Pendiente de confirmar por el taller",
  Confirmada: "Confirmada",
  Cancelada: "Cancelada",
};

/**
 * Página de una cita para el cliente (`/<slug>/cita/<token>`): ver los datos y cancelarla hasta
 * 24 horas antes. El token de la URL es la credencial; nunca se muestra el teléfono del cliente.
 */
export function CitaClientePage() {
  const taller = useTaller();
  const { token = "" } = useParams();
  // Un token que ni siquiera tiene forma de uuid no se consulta: es "no encontrada" desde el principio.
  const [estado, setEstado] = useState<Estado>(() => (esTokenValido(token) ? { fase: "cargando" } : { fase: "no_encontrada" }));
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelada, setCancelada] = useState(false);

  useEffect(() => {
    if (!esTokenValido(token)) return;
    let vigente = true;
    consultarCita(token)
      .then((cita) => {
        if (!vigente) return;
        if (!cita || cita.taller_slug !== taller.slug) setEstado({ fase: "no_encontrada" });
        else setEstado({ fase: "lista", cita });
      })
      .catch((fallo: unknown) => {
        console.error("consultar_cita_cliente:", fallo);
        if (vigente) setEstado({ fase: "error", mensaje: "No se pudo cargar la cita. Comprueba tu conexión e inténtalo de nuevo." });
      });
    return () => {
      vigente = false;
    };
  }, [token, taller.slug]);

  async function cancelar() {
    if (estado.fase !== "lista" || cancelando) return;
    setCancelando(true);
    setError(null);
    const mensaje = await cancelarCita(token);
    setCancelando(false);
    setConfirmando(false);
    if (mensaje) {
      setError(mensaje);
      // El estado real puede haber cambiado (plazo pasado, ya cancelada): se vuelve a leer.
      const cita = await consultarCita(token).catch(() => null);
      if (cita) setEstado({ fase: "lista", cita });
      return;
    }
    setCancelada(true);
    setEstado({ fase: "lista", cita: { ...estado.cita, estado: "Cancelada", cancelada_por: "cliente", puede_cancelar: false } });
  }

  if (estado.fase === "cargando") return <PantallaCargando texto="Buscando tu cita..." />;

  const telefonoTaller = taller.telefono ?? (estado.fase === "lista" ? estado.cita.taller_telefono : null);

  if (estado.fase === "no_encontrada" || estado.fase === "error") {
    return (
      <div className="container">
        <div className="card cita-cliente">
          <h1>{taller.nombre}</h1>
          <p className="subtitulo">{estado.fase === "error" ? estado.mensaje : "No encontramos ninguna cita con este enlace. Comprueba que lo has copiado entero."}</p>
          {telefonoTaller && (
            <p className="nota-final">
              Si tienes dudas, llama al taller: <a href={`tel:${telefonoTaller}`}>{telefonoTaller}</a>.
            </p>
          )}
          <Link className="boton-principal cita-cliente-enlace" to={`/${taller.slug}`}>
            PEDIR UNA CITA
          </Link>
        </div>
      </div>
    );
  }

  const { cita } = estado;
  const esCancelada = cita.estado === "Cancelada";

  return (
    <div className="container">
      <div className="card cita-cliente">
        <h1>Tu cita en {cita.taller_nombre}</h1>

        <p className={`cita-cliente-estado estado-${cita.estado.toLowerCase()}`}>
          {esCancelada && cita.cancelada_por === "cliente" ? "Cancelada por ti" : ETIQUETA_ESTADO[cita.estado]}
        </p>

        {(taller.direccion || taller.ciudad) && (
          <p className="cita-cliente-direccion">
            <MapPin aria-hidden="true" />
            {taller.direccion ? taller.direccion : taller.ciudad}
          </p>
        )}

        {cancelada && <Alerta tipo="ok">Tu cita ha quedado cancelada. Gracias por avisar.</Alerta>}

        <div className="resumen-reserva">
          <div className="resumen-item">
            <span>Fecha</span>
            <strong>{formatearDiaLargo(cita.dia, { conAnio: true })}</strong>
          </div>
          <div className="resumen-item">
            <span>Hora</span>
            <strong>{horaCorta(cita.hora)}</strong>
          </div>
          <div className="resumen-item">
            <span>Servicio</span>
            <strong>{cita.servicio || "-"}</strong>
          </div>
          <div className="resumen-item">
            <span>Vehículo</span>
            <strong>{cita.vehiculo || "-"}</strong>
          </div>
          <div className="resumen-item">
            <span>Matrícula</span>
            <strong>{cita.matricula || "-"}</strong>
          </div>
          <div className="resumen-item">
            <span>A nombre de</span>
            <strong>{cita.nombre || "-"}</strong>
          </div>
        </div>

        {error && <Alerta tipo="error">{error}</Alerta>}

        {!esCancelada && cita.puede_cancelar && (
          <>
            <p className="nota-final">Si no puedes venir, cancela la cita y el taller lo verá al momento. Puedes hacerlo hasta 24 horas antes.</p>
            <button type="button" className="boton-principal boton-cancelar-cita" onClick={() => setConfirmando(true)} disabled={cancelando}>
              CANCELAR MI CITA
            </button>
          </>
        )}

        {!esCancelada && !cita.puede_cancelar && (
          <p className="nota-final">
            Ya no se puede cancelar por internet porque faltan menos de 24 horas.
            {telefonoTaller ? (
              <>
                {" "}
                Llama al taller: <a href={`tel:${telefonoTaller}`}>{telefonoTaller}</a>.
              </>
            ) : (
              " Ponte en contacto con el taller."
            )}
          </p>
        )}

        {esCancelada && (
          <Link className="boton-principal cita-cliente-enlace" to={`/${taller.slug}`}>
            PEDIR OTRA CITA
          </Link>
        )}

        {telefonoTaller && !esCancelada && cita.puede_cancelar && (
          <p className="nota-final">
            Para cualquier otra cosa, llama al taller: <a href={`tel:${telefonoTaller}`}>{telefonoTaller}</a>.
          </p>
        )}

        <FirmaCiTaller />

        {confirmando && (
          <Modal titulo="Cancelar tu cita" textoConfirmar="Sí, cancelar" textoCancelar="No, mantenerla" peligroso ocupado={cancelando} onConfirmar={() => void cancelar()} onCancelar={() => setConfirmando(false)}>
            <p>
              ¿Seguro que quieres cancelar la cita del <strong>{formatearDiaLargo(cita.dia)}</strong> a las <strong>{horaCorta(cita.hora)}</strong>? El hueco quedará libre para otra persona.
            </p>
          </Modal>
        )}
      </div>
    </div>
  );
}

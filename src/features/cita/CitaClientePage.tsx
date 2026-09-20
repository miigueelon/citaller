import { useTaller } from "@/app/providers/useTaller";

/**
 * Página de una cita para el cliente (`/<slug>/cita/<token>`). Se completa en la fase 3.5:
 * ver los datos de la cita y cancelarla hasta 24 horas antes.
 */
export function CitaClientePage() {
  const taller = useTaller();

  return (
    <div className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>{taller.nombre}</h1>
        <p className="subtitulo">Muy pronto podrás ver y cancelar tu cita desde este enlace.</p>
        {taller.telefono && (
          <p style={{ color: "#6b7280", fontSize: "15px" }}>
            Mientras tanto, para cualquier cambio llama al taller: <strong>{taller.telefono}</strong>.
          </p>
        )}
      </div>
    </div>
  );
}

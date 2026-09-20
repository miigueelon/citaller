export function NoEncontrado({ mensaje = "Esta página no existe." }: { mensaje?: string }) {
  return (
    <div className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>CiTaller</h1>
        <p className="subtitulo">{mensaje}</p>
        <p style={{ color: "#6b7280", fontSize: "15px" }}>
          Comprueba el enlace que te ha dado tu taller o escanea de nuevo su código QR.
        </p>
      </div>
    </div>
  );
}

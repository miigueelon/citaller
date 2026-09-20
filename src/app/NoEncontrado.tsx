export function NoEncontrado({ mensaje = "Esta página no existe." }: { mensaje?: string }) {
  return (
    <div className="container">
      <div className="card">
        <h1>CiTaller</h1>
        <p className="subtitulo">{mensaje}</p>
        <p className="texto-secundario centrado">
          Comprueba el enlace que te ha dado tu taller o escanea de nuevo su código QR.
        </p>
      </div>
    </div>
  );
}

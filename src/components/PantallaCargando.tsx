export function PantallaCargando({ texto = "Cargando..." }: { texto?: string }) {
  return (
    <div style={{ padding: "40px", textAlign: "center" }} role="status">
      {texto}
    </div>
  );
}

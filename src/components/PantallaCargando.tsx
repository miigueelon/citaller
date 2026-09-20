import estilos from "./PantallaCargando.module.css";

export function PantallaCargando({ texto = "Cargando..." }: { texto?: string }) {
  return (
    <div className={estilos.pantalla} role="status">
      {texto}
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { useAuth } from "@/app/providers/useAuth";
import estilos from "./LoginPage.module.css";

/** Acceso al panel del taller con email y contraseña. */
export function LoginPage() {
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setError("");
    const mensaje = await iniciarSesion(email, password);
    if (mensaje) setError(mensaje);
    setCargando(false);
  }

  return (
    <div className={estilos.contenedor}>
      <h2 className={estilos.titulo}>Acceso taller</h2>

      <form onSubmit={enviar}>
        <input type="email" className={estilos.campo} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <input
          type="password"
          className={estilos.campo}
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="boton-principal" disabled={cargando}>
          {cargando ? "Entrando..." : "Entrar"}
        </button>

        {error && <p className={estilos.error}>{error}</p>}
      </form>
    </div>
  );
}

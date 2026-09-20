import { useState, type FormEvent } from "react";
import { useAuth } from "@/app/providers/useAuth";

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
    <div style={{ maxWidth: "400px", margin: "80px auto" }}>
      <h2>Acceso taller</h2>

      <form onSubmit={enviar}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "10px" }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "10px" }}
        />

        <button type="submit" disabled={cargando} style={{ width: "100%", padding: "12px" }}>
          {cargando ? "Entrando..." : "Entrar"}
        </button>

        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
      </form>
    </div>
  );
}

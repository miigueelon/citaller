import { useState } from "react";

export default function LoginTaller({
  supabaseClient,
  tallerId,
  onLogin,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e) {
    e.preventDefault();

    setCargando(true);
    setError("");

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      console.error("Error login:", error);
      setError("Email o contraseña incorrectos");
      setCargando(false);
      return;
    }

    // Comprobar que este usuario pertenece
    // al taller de la URL actual
    const {
      data: tallerUsuario,
      error: errorTaller,
    } = await supabaseClient
      .from("talleres")
      .select("id")
      .eq("id", tallerId)
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (errorTaller || !tallerUsuario) {
  await supabaseClient.auth.signOut();

  setError(
    "Estas credenciales pertenecen a otro taller."
  );

  setCargando(false);
  return;
}

    onLogin(data.user);
    setCargando(false);
  }

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "80px auto",
      }}
    >
      <h2>Acceso taller</h2>

      <form onSubmit={iniciarSesion}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "10px",
          }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "10px",
          }}
        />

        <button
          type="submit"
          disabled={cargando}
          style={{
            width: "100%",
            padding: "12px",
          }}
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>

        {error && (
          <p
            style={{
              color: "red",
              marginTop: "10px",
            }}
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
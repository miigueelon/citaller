// Lee y valida las variables de entorno del frontend (prefijo VITE_).
// Falla al arrancar si faltan, para no desplegar una app apuntando a ningún sitio.

function requerir(nombre: string): string {
  const valor = import.meta.env[nombre];
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Copia .env.example a .env.local y rellénala (ver docs/operaciones.md).`,
    );
  }
  return valor.trim();
}

export const env = {
  supabaseUrl: requerir("VITE_SUPABASE_URL"),
  supabaseAnonKey: requerir("VITE_SUPABASE_ANON_KEY"),
} as const;

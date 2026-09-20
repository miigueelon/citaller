import { supabasePublic } from "@/lib/supabase/client";

/** Datos públicos de un taller (vista `talleres_publicos`: solo talleres activos, sin datos internos). */
export interface Taller {
  id: number;
  slug: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  horario_texto: string | null;
  valoracion: number | null;
  numero_resenas: number | null;
  capacidad_simultanea: number;
}

const COLUMNAS = "id, slug, nombre, telefono, direccion, ciudad, horario_texto, valoracion, numero_resenas, capacidad_simultanea";

type Fila = {
  id: number | null;
  slug: string | null;
  nombre: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  horario_texto: string | null;
  valoracion: number | null;
  numero_resenas: number | null;
  capacidad_simultanea: number | null;
};

function aTaller(fila: Fila): Taller | null {
  if (fila.id == null || !fila.slug || !fila.nombre) return null;
  return {
    id: fila.id,
    slug: fila.slug,
    nombre: fila.nombre,
    telefono: fila.telefono,
    direccion: fila.direccion,
    ciudad: fila.ciudad,
    horario_texto: fila.horario_texto,
    valoracion: fila.valoracion,
    numero_resenas: fila.numero_resenas,
    capacidad_simultanea: fila.capacidad_simultanea ?? 1,
  };
}

/** Taller por su identificador público de la URL. `null` si no existe o está inactivo. */
export async function cargarTallerPorSlug(slug: string): Promise<Taller | null> {
  const { data, error } = await supabasePublic.from("talleres_publicos").select(COLUMNAS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`No se pudo cargar el taller "${slug}": ${error.message}`);
  return data ? aTaller(data) : null;
}

/** Taller por id numérico; solo lo usa la redirección de las URLs antiguas (`?taller=N`). */
export async function cargarTallerPorId(id: number): Promise<Taller | null> {
  const { data, error } = await supabasePublic.from("talleres_publicos").select(COLUMNAS).eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo cargar el taller ${id}: ${error.message}`);
  return data ? aTaller(data) : null;
}

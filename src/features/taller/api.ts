import { supabasePublic } from "@/lib/supabase/client";

export type ModoCapacidad = "por_hora" | "por_dia";
export type ModoWhatsapp = "api" | "enlace" | "ninguno";
export type ModoDescripcion = "oculta" | "opcional" | "obligatoria";
export type TipoCampo = "numero" | "texto" | "select";

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
  modo_capacidad: ModoCapacidad;
  /** Elevadores/mecánicos a la vez (por hora) o citas al día (por día). */
  capacidad: number;
  texto_aviso_tarde: string | null;
  texto_confirmacion: string | null;
  whatsapp_modo: ModoWhatsapp;
}

export interface ServicioTaller {
  id: number;
  nombre: string;
  orden: number;
  descripcion_modo: ModoDescripcion;
  descripcion_etiqueta: string | null;
  descripcion_placeholder: string | null;
  descripcion_ayuda: string | null;
  imagen_ayuda_url: string | null;
}

export interface CampoFormulario {
  id: number;
  /** null = para todos los servicios. */
  servicio_id: number | null;
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones: string[] | null;
  obligatorio: boolean;
  orden: number;
  unidad: string | null;
  ayuda: string | null;
}

/** Todo lo que la página necesita saber de un taller: ficha, servicios y campos del formulario. */
export interface TallerConfig extends Taller {
  servicios: ServicioTaller[];
  campos: CampoFormulario[];
}

const COLUMNAS_TALLER =
  "id, slug, nombre, telefono, direccion, ciudad, horario_texto, valoracion, numero_resenas, modo_capacidad, capacidad, texto_aviso_tarde, texto_confirmacion, whatsapp_modo";

type FilaTaller = {
  id: number | null;
  slug: string | null;
  nombre: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  horario_texto: string | null;
  valoracion: number | null;
  numero_resenas: number | null;
  modo_capacidad: string | null;
  capacidad: number | null;
  texto_aviso_tarde: string | null;
  texto_confirmacion: string | null;
  whatsapp_modo: string | null;
};

function aTaller(fila: FilaTaller): Taller | null {
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
    modo_capacidad: fila.modo_capacidad === "por_dia" ? "por_dia" : "por_hora",
    capacidad: fila.capacidad ?? 1,
    texto_aviso_tarde: fila.texto_aviso_tarde,
    texto_confirmacion: fila.texto_confirmacion,
    whatsapp_modo: fila.whatsapp_modo === "api" || fila.whatsapp_modo === "enlace" ? fila.whatsapp_modo : "ninguno",
  };
}

/** Taller por su identificador público de la URL. `null` si no existe o está inactivo. */
export async function cargarTallerPorSlug(slug: string): Promise<Taller | null> {
  const { data, error } = await supabasePublic.from("talleres_publicos").select(COLUMNAS_TALLER).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`No se pudo cargar el taller "${slug}": ${error.message}`);
  return data ? aTaller(data) : null;
}

/** Taller por id numérico; solo lo usa la redirección de las URLs antiguas (`?taller=N`). */
export async function cargarTallerPorId(id: number): Promise<Taller | null> {
  const { data, error } = await supabasePublic.from("talleres_publicos").select(COLUMNAS_TALLER).eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo cargar el taller ${id}: ${error.message}`);
  return data ? aTaller(data) : null;
}

/** Servicios activos del taller, en el orden del desplegable. */
export async function cargarServicios(tallerId: number): Promise<ServicioTaller[]> {
  const { data, error } = await supabasePublic
    .from("servicios_taller")
    .select("id, nombre, orden, descripcion_modo, descripcion_etiqueta, descripcion_placeholder, descripcion_ayuda, imagen_ayuda_url")
    .eq("taller_id", tallerId)
    .eq("activo", true)
    .order("orden")
    .order("nombre");
  if (error) throw new Error(`No se pudieron cargar los servicios: ${error.message}`);
  return (data ?? []).map((fila) => ({
    ...fila,
    descripcion_modo: fila.descripcion_modo === "obligatoria" || fila.descripcion_modo === "opcional" ? fila.descripcion_modo : "oculta",
  }));
}

/** Campos extra del formulario del taller (para todos los servicios o para uno). */
export async function cargarCampos(tallerId: number): Promise<CampoFormulario[]> {
  const { data, error } = await supabasePublic
    .from("campos_formulario_taller")
    .select("id, servicio_id, clave, etiqueta, tipo, opciones, obligatorio, orden, unidad, ayuda")
    .eq("taller_id", tallerId)
    .order("orden");
  if (error) throw new Error(`No se pudieron cargar los campos del formulario: ${error.message}`);
  return (data ?? []).map((fila) => ({
    ...fila,
    tipo: fila.tipo === "numero" || fila.tipo === "select" ? fila.tipo : "texto",
    opciones: Array.isArray(fila.opciones) ? fila.opciones.map(String) : null,
  }));
}

export async function cargarConfiguracion(taller: Taller): Promise<TallerConfig> {
  const [servicios, campos] = await Promise.all([cargarServicios(taller.id), cargarCampos(taller.id)]);
  return { ...taller, servicios, campos };
}

/** Campos que aplican a un servicio: los generales más los propios del servicio. */
export function camposDelServicio(campos: CampoFormulario[], servicio: ServicioTaller | undefined): CampoFormulario[] {
  return campos.filter((campo) => campo.servicio_id === null || (servicio !== undefined && campo.servicio_id === servicio.id));
}

// Prueba de la cadena completa contra el taller de pruebas e2e (id 3).
// No toca datos de Speedbikes ni de Rik and Roll: solo lee para comprobar que están protegidos.
//
// Flujos (docs/plan.md §4): A reservar y sus rechazos, B panel y aislamiento, C confirmar por la
// Edge `confirmar-reserva` (WhatsApp según modo + Calendar), D cancelar por `cancelar-reserva`,
// E conectar Google, G cita manual por `crear-reserva-taller`, H cancelación por el cliente por
// `consultar_cita_cliente` + `cancelar-cita-cliente`. Necesita E2E_TALLER_EMAIL/PASSWORD en
// .env.local. Con SR_KEY (clave de servicio) borra al final lo creado; sin ella, lo deja cancelado.
import { readFileSync } from "node:fs";

const URL_BASE = "https://zrrqqqbgwwovmglhqxwn.supabase.co";
const env = Object.fromEntries(
  readFileSync("C:/Users/Miguel/citaller/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SR_KEY;
const TALLER_E2E = 3;
const SERVICIO = "Revisión / mantenimiento";

// Día laborable a partir de pasado mañana (así la cancelación del cliente está dentro de las 24 h).
function diaLaborable(desdeDias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + desdeDias);
  while (fecha.getDay() === 0 || fecha.getDay() === 6 || (fecha.getMonth() === 11 && fecha.getDate() === 25)) fecha.setDate(fecha.getDate() + 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}
// Hoy en la zona del taller (Europe/Madrid), sin saltar el fin de semana: la cita manual no valida
// horario, así que 'hoy a las 23:59' siempre está a menos de 24 h y sirve para probar el plazo.
function hoyMadrid() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const DIA = diaLaborable(2);
const DIA_2 = diaLaborable(9);
// Teléfonos distintos por escenario y por ejecución: la RPC limita a 3 citas activas y 5 creaciones
// al día por teléfono, así que repetir la prueba el mismo día con números fijos daría CT006.
// El prefijo 6001 se conserva para que la limpieza previa siga reconociéndolos.
const SELLO = Math.floor(Date.now() / 60000) % 4000;
const telefono = (n) => `6001${String((SELLO * 25 + n) % 100000).padStart(5, "0")}`;
const creadas = [];

let fallos = 0;
function comprobar(titulo, ok, detalle) {
  console.log(`${ok ? "OK  " : "FALLA"} ${titulo}${detalle ? ` → ${detalle}` : ""}`);
  if (!ok) fallos++;
}

async function pedir(ruta, { token = ANON, metodo = "GET", cuerpo, cabeceras = {} } = {}) {
  const r = await fetch(`${URL_BASE}${ruta}`, {
    method: metodo,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...cabeceras },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  let datos;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  return { status: r.status, datos };
}

const reservaBase = (extra = {}) => ({
  p_taller_id: TALLER_E2E,
  p_matricula: "E2E1234",
  p_nombre: "Cliente de prueba",
  p_telefono: telefono(1),
  p_vehiculo: "Coche de prueba",
  p_servicio: SERVICIO,
  p_descripcion: "Reserva creada por la verificación automática",
  p_dia: DIA,
  p_hora: "10:00",
  p_datos_extra: { kilometros: "1000" },
  ...extra,
});

async function reservar(extra) {
  const r = await pedir("/rest/v1/rpc/crear_reserva_publica", { metodo: "POST", cuerpo: reservaBase(extra) });
  const fila = Array.isArray(r.datos) ? r.datos[0] : null;
  if (fila?.reserva_id) creadas.push(fila.reserva_id);
  return { ...r, fila };
}

const codigo = (r) => r.datos?.code ?? r.datos?.codigo ?? "";

// ---------------------------------------------------------------------------------------------
// B. Login del taller de pruebas
const login = await pedir("/auth/v1/token?grant_type=password", { metodo: "POST", cuerpo: { email: env.E2E_TALLER_EMAIL, password: env.E2E_TALLER_PASSWORD } });
comprobar("B. Login del taller de pruebas", login.status === 200 && !!login.datos?.access_token, `HTTP ${login.status}`);
const TOKEN = login.datos?.access_token;
if (!TOKEN) process.exit(1);

/** Cancela como el panel: por la Edge Function. Desde la fase 4 nadie escribe en reservas por REST. */
async function cancelarComoTaller(id) {
  const r = await pedir("/functions/v1/cancelar-reserva", { token: TOKEN, metodo: "POST", cuerpo: { reserva_id: id } });
  return r.status === 200;
}

// Restos de ejecuciones anteriores (si se interrumpió antes de limpiar): se cancelan para que los
// huecos del taller de pruebas estén libres y el script sea repetible.
const restos = await pedir(`/rest/v1/reservas?taller_id=eq.${TALLER_E2E}&estado=in.(Pendiente,Confirmada)&or=(telefono.like.346001*,matricula.in.(E2E1234,MOSTR01,MOSTR02,HOY0001))&select=id`, { token: TOKEN });
for (const fila of restos.datos ?? []) await cancelarComoTaller(fila.id);
if ((restos.datos ?? []).length > 0) console.log(`(limpieza previa: ${restos.datos.length} reservas de prueba antiguas canceladas)`);

// A. Lecturas públicas que hace la pantalla de reserva
const vista = await pedir(`/rest/v1/talleres_publicos?id=eq.${TALLER_E2E}&select=id,nombre,slug,modo_capacidad,capacidad,whatsapp_modo`);
comprobar("A. La web pública ve el taller y su configuración", vista.status === 200 && vista.datos?.[0]?.modo_capacidad === "por_hora" && vista.datos[0].capacidad === 2, JSON.stringify(vista.datos?.[0]));
const SLUG = vista.datos?.[0]?.slug ?? "e2e";

const servicios = await pedir(`/rest/v1/servicios_taller?taller_id=eq.${TALLER_E2E}&select=id,nombre,descripcion_modo&order=orden`);
comprobar("A. La web pública ve los servicios del taller", servicios.status === 200 && servicios.datos?.length === 7, `${servicios.datos?.length} servicios`);

const campos = await pedir(`/rest/v1/campos_formulario_taller?taller_id=eq.${TALLER_E2E}&select=clave,tipo,obligatorio,servicio_id`);
comprobar("A. La web pública ve los campos extra", campos.status === 200 && campos.datos?.length === 2, `${campos.datos?.length} campos`);

const horarios = await pedir(`/rest/v1/horarios_taller?taller_id=eq.${TALLER_E2E}&select=dia_semana,hora`);
comprobar("A. La web pública ve sus horarios", horarios.status === 200 && horarios.datos?.length === 20, `${horarios.datos?.length} horas`);

// A. Reserva pública por la RPC v2
const crear = await reservar();
comprobar("A. Reservar como cliente anónimo (RPC v2)", crear.status === 200 && typeof crear.fila?.reserva_id === "number" && /^[0-9a-f-]{36}$/.test(crear.fila?.token_publico ?? ""), `HTTP ${crear.status} ${JSON.stringify(crear.datos).slice(0, 100)}`);
const reserva = crear.fila;
if (!reserva) process.exit(1);

const ocupacion = await pedir("/rest/v1/rpc/ocupacion_dia", { metodo: "POST", cuerpo: { p_taller_id: TALLER_E2E, p_dia: DIA } });
comprobar("A. La ocupación pública cuenta la reserva", ocupacion.status === 200 && (ocupacion.datos || []).some((f) => f.hora === "10:00:00"), JSON.stringify(ocupacion.datos));

const pii = await pedir("/rest/v1/reservas?select=nombre,telefono");
comprobar("A. El público no puede leer datos personales", pii.status === 401 || pii.status === 403, `HTTP ${pii.status}`);
const tokenAnon = await pedir("/rest/v1/reservas?select=token_publico");
comprobar("A. El público no puede leer los tokens de las citas", tokenAnon.status === 401 || tokenAnon.status === 403, `HTTP ${tokenAnon.status}`);

// A. Rechazos de la base de datos (códigos CTxxx)
const rechazos = [
  ["festivo", { p_dia: "2026-12-25", p_telefono: telefono(2) }, "CT003"],
  ["fuera de horario", { p_hora: "13:00", p_telefono: telefono(3) }, "CT002"],
  ["día pasado", { p_dia: "2020-01-01", p_telefono: telefono(4) }, "CT004"],
  ["más de 90 días", { p_dia: diaLaborable(120), p_telefono: telefono(5) }, "CT004"],
  ["teléfono inválido", { p_telefono: "12345" }, "CT005"],
  ["matrícula inválida", { p_matricula: "12*", p_telefono: telefono(6) }, "CT013"],
  ["servicio inexistente", { p_servicio: "Tuneo", p_telefono: telefono(7) }, "CT007"],
  ["Neumáticos sin cantidad", { p_servicio: "Neumáticos", p_descripcion: "205/55 R16", p_telefono: telefono(8) }, "CT008"],
  ["Neumáticos sin medidas", { p_servicio: "Neumáticos", p_descripcion: "", p_datos_extra: { cantidad_neumaticos: "2" }, p_telefono: telefono(9) }, "CT008"],
  ["opción fuera de la lista", { p_servicio: "Neumáticos", p_descripcion: "205/55 R16", p_datos_extra: { cantidad_neumaticos: "9" }, p_telefono: telefono(10) }, "CT008"],
  ["kilómetros con letras", { p_datos_extra: { kilometros: "12a" }, p_telefono: telefono(11) }, "CT008"],
  ["taller inexistente", { p_taller_id: 999, p_telefono: telefono(12) }, "CT009"],
];
for (const [nombre, extra, esperado] of rechazos) {
  const r = await reservar(extra);
  comprobar(`A. Rechazo: ${nombre} → ${esperado}`, r.status === 400 && codigo(r) === esperado, `HTTP ${r.status} ${codigo(r)} ${String(r.datos?.message ?? "").slice(0, 60)}`);
}

// A. Capacidad por hora (2) y límite de 3 activas por teléfono
const segunda = await reservar({ p_telefono: telefono(13) });
const tercera = await reservar({ p_telefono: telefono(14) });
comprobar("A. Hueco lleno: la tercera reserva a la misma hora se rechaza (CT001)", segunda.status === 200 && tercera.status === 400 && codigo(tercera) === "CT001", `HTTP ${segunda.status}/${tercera.status} ${codigo(tercera)}`);

const t3 = telefono(15);
const l1 = await reservar({ p_telefono: t3, p_hora: "09:00" });
const l2 = await reservar({ p_telefono: t3, p_hora: "11:00" });
const l3 = await reservar({ p_telefono: t3, p_hora: "12:00" });
const l4 = await reservar({ p_telefono: t3, p_dia: DIA_2, p_hora: "09:00" });
comprobar("A. Más de 3 citas activas con el mismo teléfono se rechaza (CT006)", l1.status === 200 && l2.status === 200 && l3.status === 200 && l4.status === 400 && codigo(l4) === "CT006", `HTTP ${l1.status}/${l2.status}/${l3.status}/${l4.status} ${codigo(l4)}`);

// A. Concurrencia: dos peticiones a la vez por el último hueco de una hora → solo una entra
const [c1, c2] = await Promise.all([reservar({ p_telefono: telefono(16), p_dia: DIA_2, p_hora: "10:00" }), reservar({ p_telefono: telefono(17), p_dia: DIA_2, p_hora: "10:00" })]);
const [c3, c4] = await Promise.all([reservar({ p_telefono: telefono(18), p_dia: DIA_2, p_hora: "10:00" }), reservar({ p_telefono: telefono(19), p_dia: DIA_2, p_hora: "10:00" })]);
const entraron = [c1, c2, c3, c4].filter((r) => r.status === 200).length;
comprobar("A. Concurrencia: cuatro peticiones por dos huecos → entran exactamente dos", entraron === 2, `${entraron} creadas`);

// B. El panel ve su reserva y nada de otros talleres
const mias = await pedir(`/rest/v1/reservas?id=eq.${reserva.reserva_id}&select=id,estado,datos_extra,creada_por,servicio_id,telefono`, { token: TOKEN });
const fila = mias.datos?.[0];
comprobar("B. El panel ve su reserva pendiente con datos_extra y servicio enlazado", mias.status === 200 && fila?.estado === "Pendiente" && fila?.datos_extra?.kilometros === 1000 && fila?.creada_por === "cliente" && fila?.servicio_id != null && fila?.telefono === `34${telefono(1)}`, JSON.stringify(fila));

const ajenas = await pedir("/rest/v1/reservas?taller_id=eq.2&select=id,nombre", { token: TOKEN });
comprobar("B. No ve las reservas de otro taller", ajenas.status === 200 && ajenas.datos?.length === 0, `${ajenas.datos?.length ?? "?"} filas`);

const talleresVisibles = await pedir("/rest/v1/talleres?select=id,nombre,user_id", { token: TOKEN });
comprobar("B. Solo ve la ficha de su propio taller", talleresVisibles.status === 200 && talleresVisibles.datos?.length === 1 && talleresVisibles.datos[0].id === TALLER_E2E, `${talleresVisibles.datos?.length ?? "?"} filas`);

const internas = await pedir("/rest/v1/integraciones_calendario?select=id", { token: TOKEN });
comprobar("B. No puede leer las integraciones de calendario", internas.status === 401 || internas.status === 403, `HTTP ${internas.status}`);

const ajena = await pedir("/rest/v1/reservas?taller_id=eq.2&estado=eq.Confirmada&limit=1", { token: TOKEN, metodo: "PATCH", cuerpo: { estado: "Cancelada" }, cabeceras: { Prefer: "return=representation" } });
// Antes de la fase 4: 200 con 0 filas (la política no deja ver las ajenas). Después: 401/403 (sin UPDATE por REST).
comprobar("B. No puede cambiar reservas de otro taller por REST", (ajena.status === 200 && ajena.datos?.length === 0) || ajena.status === 401 || ajena.status === 403, `HTTP ${ajena.status}, ${Array.isArray(ajena.datos) ? ajena.datos.length : "?"} filas`);

// C. Confirmar por la Edge Function (una sola llamada: estado + WhatsApp según modo + Calendar)
const confirmar = await pedir("/functions/v1/confirmar-reserva", { token: TOKEN, metodo: "POST", cuerpo: { reserva_id: reserva.reserva_id } });
const n1 = confirmar.datos?.notificaciones;
comprobar("C. confirmar-reserva confirma la cita y devuelve las notificaciones", confirmar.status === 200 && confirmar.datos?.ok === true && confirmar.datos?.estado === "Confirmada" && !!n1, `HTTP ${confirmar.status} ${JSON.stringify(confirmar.datos).slice(0, 120)}`);
comprobar("C. WhatsApp: el taller e2e está en modo 'ninguno' → no se envía", n1?.whatsapp?.modo === "ninguno" && n1?.whatsapp?.enviado === false, JSON.stringify(n1?.whatsapp));
const conCalendario = n1?.calendario?.creado === true;
if (conCalendario) {
  comprobar("C. Evento creado en Google Calendar", !!n1.calendario.google_event_id, n1.calendario.google_event_id);
  const conId = await pedir(`/rest/v1/reservas?id=eq.${reserva.reserva_id}&select=google_event_id,confirmada_en,google_error`, { token: TOKEN });
  comprobar("C. La reserva guarda el id del evento y confirmada_en", conId.datos?.[0]?.google_event_id === n1.calendario.google_event_id && !!conId.datos?.[0]?.confirmada_en && conId.datos?.[0]?.google_error === null, JSON.stringify(conId.datos?.[0]));
} else {
  comprobar("C. Calendar: el taller e2e no está conectado (o falló) y la función lo dice", n1?.calendario?.motivo === "sin_calendario" || !!n1?.calendario?.error, JSON.stringify(n1?.calendario));
}
const repetido = await pedir("/functions/v1/confirmar-reserva", { token: TOKEN, metodo: "POST", cuerpo: { reserva_id: reserva.reserva_id } });
comprobar("C. Confirmar dos veces no falla ni crea un segundo evento", repetido.status === 200 && repetido.datos?.ok === true && repetido.datos?.notificaciones?.calendario?.creado !== true, JSON.stringify(repetido.datos?.notificaciones?.calendario));

const confirmarAjena = await pedir("/functions/v1/confirmar-reserva", { token: TOKEN, metodo: "POST", cuerpo: { reserva_id: 1 } });
comprobar("C. No puede confirmar una reserva de otro taller", confirmarAjena.status === 403 || confirmarAjena.status === 404, `HTTP ${confirmarAjena.status}`);

// D. Cancelar por la Edge Function
const cancelar = await pedir("/functions/v1/cancelar-reserva", { token: TOKEN, metodo: "POST", cuerpo: { reserva_id: reserva.reserva_id } });
const n2 = cancelar.datos?.notificaciones;
comprobar("D. cancelar-reserva cancela la cita", cancelar.status === 200 && cancelar.datos?.ok === true && cancelar.datos?.estado === "Cancelada", `HTTP ${cancelar.status} ${JSON.stringify(cancelar.datos).slice(0, 120)}`);
const trasCancelar = await pedir(`/rest/v1/reservas?id=eq.${reserva.reserva_id}&select=estado,cancelada_por,cancelada_en,google_event_id`, { token: TOKEN });
comprobar("D. Queda cancelada por el taller, con fecha y sin evento", trasCancelar.datos?.[0]?.estado === "Cancelada" && trasCancelar.datos?.[0]?.cancelada_por === "taller" && !!trasCancelar.datos?.[0]?.cancelada_en && trasCancelar.datos?.[0]?.google_event_id === null, JSON.stringify(trasCancelar.datos?.[0]));
if (conCalendario) comprobar("D. El evento se borró de Google Calendar", n2?.calendario?.borrado === true, JSON.stringify(n2?.calendario));

const reabrir = await pedir("/functions/v1/confirmar-reserva", { token: TOKEN, metodo: "POST", cuerpo: { reserva_id: reserva.reserva_id } });
comprobar("D. Una cita cancelada no se puede reabrir", reabrir.status === 409, `HTTP ${reabrir.status}`);

// D. Cancelar una pendiente también pasa por la función (y avisaría al cliente en modo api)
const cancelarPendiente = await pedir("/functions/v1/cancelar-reserva", { token: TOKEN, metodo: "POST", cuerpo: { reserva_id: segunda.fila.reserva_id } });
comprobar("D. Rechazar una pendiente la cancela igual", cancelarPendiente.status === 200 && cancelarPendiente.datos?.estado === "Cancelada", `HTTP ${cancelarPendiente.status}`);

// G. Cita manual desde el panel
const manual = await pedir("/functions/v1/crear-reserva-taller", {
  token: TOKEN,
  metodo: "POST",
  cuerpo: { taller_id: TALLER_E2E, nombre: "Cliente mostrador", telefono: "", matricula: "MOSTR01", vehiculo: "Furgoneta", servicio: "Frenos", descripcion: "", dia: DIA, hora: "10:00", datos_extra: {} },
});
if (manual.datos?.reserva_id) creadas.push(manual.datos.reserva_id);
comprobar("G. Cita manual sin teléfono a una hora llena: se crea igualmente", manual.status === 200 && manual.datos?.ok === true && !!manual.datos?.reserva_id, `HTTP ${manual.status} ${JSON.stringify(manual.datos).slice(0, 120)}`);
const filaManual = await pedir(`/rest/v1/reservas?id=eq.${manual.datos?.reserva_id}&select=estado,creada_por,telefono,confirmada_en`, { token: TOKEN });
comprobar("G. Nace Confirmada, creada_por='taller', sin teléfono y con confirmada_en", filaManual.datos?.[0]?.estado === "Confirmada" && filaManual.datos?.[0]?.creada_por === "taller" && filaManual.datos?.[0]?.telefono === null && !!filaManual.datos?.[0]?.confirmada_en, JSON.stringify(filaManual.datos?.[0]));
comprobar("G. Sin teléfono no se intenta WhatsApp", manual.datos?.notificaciones?.whatsapp?.enviado === false, JSON.stringify(manual.datos?.notificaciones?.whatsapp));

const manualConTel = await pedir("/functions/v1/crear-reserva-taller", {
  token: TOKEN,
  metodo: "POST",
  cuerpo: { taller_id: TALLER_E2E, nombre: "Cliente por teléfono", telefono: telefono(20), matricula: "MOSTR02", vehiculo: "Moto", servicio: "ITV", descripcion: "", dia: DIA_2, hora: "12:00", datos_extra: { kilometros: "55000" } },
});
if (manualConTel.datos?.reserva_id) creadas.push(manualConTel.datos.reserva_id);
comprobar("G. Cita manual con teléfono y campo extra", manualConTel.status === 200 && manualConTel.datos?.ok === true, `HTTP ${manualConTel.status}`);

const manualMal = await pedir("/functions/v1/crear-reserva-taller", { token: TOKEN, metodo: "POST", cuerpo: { taller_id: TALLER_E2E, nombre: "X", telefono: "", matricula: "12*", vehiculo: "V", servicio: "Frenos", dia: DIA, hora: "10:00" } });
comprobar("G. Una matrícula inválida se rechaza con CT013", manualMal.status === 400 && manualMal.datos?.codigo === "CT013", `HTTP ${manualMal.status} ${manualMal.datos?.codigo}`);

const manualAjeno = await pedir("/functions/v1/crear-reserva-taller", { token: TOKEN, metodo: "POST", cuerpo: { taller_id: 2, nombre: "X", matricula: "1234ABC", vehiculo: "V", servicio: "Frenos", dia: DIA, hora: "10:00" } });
comprobar("G. No puede apuntar citas en otro taller", manualAjeno.status === 403, `HTTP ${manualAjeno.status}`);

const rpcDirecta = await pedir("/rest/v1/rpc/insertar_reserva_taller", { token: TOKEN, metodo: "POST", cuerpo: { p_taller_id: TALLER_E2E, p_matricula: "X", p_nombre: "X", p_telefono: "", p_vehiculo: "V", p_servicio: "Frenos", p_descripcion: "", p_dia: DIA, p_hora: "10:00", p_datos_extra: {} } });
comprobar("G. La RPC de citas manuales no es invocable con sesión de taller", rpcDirecta.status === 401 || rpcDirecta.status === 403 || rpcDirecta.status === 404, `HTTP ${rpcDirecta.status}`);

// H. Cancelación por el cliente con el enlace de su cita. Usa una reserva propia (pendiente y
// dentro de plazo) para no depender del bloque de límites por teléfono de más arriba.
const tCliente = telefono(22);
const paraCliente = (await reservar({ p_telefono: tCliente, p_dia: DIA, p_hora: "09:00" })).fila;
comprobar("H. Reserva de prueba para el cliente creada", !!paraCliente?.token_publico, paraCliente ? `id ${paraCliente.reserva_id}` : "(no se creó)");
const consulta = await pedir("/rest/v1/rpc/consultar_cita_cliente", { metodo: "POST", cuerpo: { p_token: paraCliente?.token_publico } });
const cita = consulta.datos?.[0];
comprobar("H. El cliente consulta su cita con el token (anon)", consulta.status === 200 && cita?.taller_slug === SLUG && cita?.estado === "Pendiente" && cita?.puede_cancelar === true, JSON.stringify(cita));
comprobar("H. La consulta no devuelve el teléfono del cliente", cita !== undefined && !("telefono" in cita) && JSON.stringify(cita).includes(`34${tCliente}`) === false, Object.keys(cita ?? {}).join(","));

const cancelarAnon = await pedir("/rest/v1/rpc/cancelar_reserva_cliente", { metodo: "POST", cuerpo: { p_token: paraCliente?.token_publico } });
comprobar("H. La RPC de cancelar no es invocable por anon", cancelarAnon.status === 401 || cancelarAnon.status === 403 || cancelarAnon.status === 404, `HTTP ${cancelarAnon.status}`);

const cancelaCliente = await pedir("/functions/v1/cancelar-cita-cliente", { metodo: "POST", cuerpo: { token: paraCliente?.token_publico } });
comprobar("H. cancelar-cita-cliente cancela dentro de plazo (sin sesión)", cancelaCliente.status === 200 && cancelaCliente.datos?.ok === true, `HTTP ${cancelaCliente.status} ${JSON.stringify(cancelaCliente.datos).slice(0, 100)}`);
const trasCliente = await pedir(`/rest/v1/reservas?id=eq.${paraCliente?.reserva_id}&select=estado,cancelada_por,cancelada_en`, { token: TOKEN });
comprobar("H. El panel la ve como cancelada por el cliente", trasCliente.datos?.[0]?.estado === "Cancelada" && trasCliente.datos?.[0]?.cancelada_por === "cliente" && !!trasCliente.datos?.[0]?.cancelada_en, JSON.stringify(trasCliente.datos?.[0]));

const otraVez = await pedir("/functions/v1/cancelar-cita-cliente", { metodo: "POST", cuerpo: { token: paraCliente?.token_publico } });
comprobar("H. Cancelar dos veces → ya_cancelada (409)", otraVez.status === 409 && otraVez.datos?.codigo === "ya_cancelada", `HTTP ${otraVez.status} ${otraVez.datos?.codigo}`);

const inventado = await pedir("/functions/v1/cancelar-cita-cliente", { metodo: "POST", cuerpo: { token: "00000000-0000-4000-8000-000000000000" } });
comprobar("H. Token inventado → no_encontrada (404)", inventado.status === 404 && inventado.datos?.codigo === "no_encontrada", `HTTP ${inventado.status} ${inventado.datos?.codigo}`);

const malFormado = await pedir("/functions/v1/cancelar-cita-cliente", { metodo: "POST", cuerpo: { token: "hola" } });
comprobar("H. Token mal formado → 404", malFormado.status === 404, `HTTP ${malFormado.status}`);

// H. A menos de 24 h no se puede: cita manual para hoy a última hora (el taller puede apuntarla,
// no valida horario), el cliente ya no puede cancelarla.
const hoyStr = hoyMadrid();
const paraHoy = await pedir("/functions/v1/crear-reserva-taller", { token: TOKEN, metodo: "POST", cuerpo: { taller_id: TALLER_E2E, nombre: "Cliente hoy", telefono: telefono(21), matricula: "HOY0001", vehiculo: "V", servicio: "Frenos", descripcion: "", dia: hoyStr, hora: "23:59", datos_extra: {} } });
if (paraHoy.datos?.reserva_id) creadas.push(paraHoy.datos.reserva_id);
if (paraHoy.status === 200 && paraHoy.datos?.token_publico) {
  const consultaHoy = await pedir("/rest/v1/rpc/consultar_cita_cliente", { metodo: "POST", cuerpo: { p_token: paraHoy.datos.token_publico } });
  const fueraPlazo = await pedir("/functions/v1/cancelar-cita-cliente", { metodo: "POST", cuerpo: { token: paraHoy.datos.token_publico } });
  comprobar("H. A menos de 24 h: puede_cancelar=false y la función responde fuera_de_plazo (409)", consultaHoy.datos?.[0]?.puede_cancelar === false && fueraPlazo.status === 409 && fueraPlazo.datos?.codigo === "fuera_de_plazo", `HTTP ${fueraPlazo.status} ${fueraPlazo.datos?.codigo}`);
} else {
  comprobar("H. (no se pudo crear la cita de hoy para probar el plazo)", false, `HTTP ${paraHoy.status} ${JSON.stringify(paraHoy.datos).slice(0, 100)}`);
}

// E. Conectar Google: la función crea el state y devuelve una URL de Google
const conectar = await pedir("/functions/v1/conectar-google-calendar", { token: TOKEN, metodo: "POST", cuerpo: { taller_id: TALLER_E2E, volver_a: `http://localhost:5173/${SLUG}/panel` } });
const authUrl = conectar.datos?.auth_url || "";
comprobar("E. Conectar devuelve una URL de Google", conectar.status === 200 && authUrl.startsWith("https://accounts.google.com/"), `HTTP ${conectar.status}`);
const parametros = authUrl ? new URLSearchParams(authUrl.split("?")[1]) : new URLSearchParams();
comprobar("E. La URL lleva el redirect_uri registrado en Google", parametros.get("redirect_uri") === `${URL_BASE}/functions/v1/google-calendar-callback`, parametros.get("redirect_uri") || "(ninguno)");
comprobar("E. Pide permiso de calendario y refresh token", parametros.get("scope") === "https://www.googleapis.com/auth/calendar.events" && parametros.get("access_type") === "offline", `${parametros.get("scope")} / ${parametros.get("access_type")}`);
const conectarAjeno = await pedir("/functions/v1/conectar-google-calendar", { token: TOKEN, metodo: "POST", cuerpo: { taller_id: 2 } });
comprobar("E. No puede iniciar la conexión de otro taller", conectarAjeno.status === 403, `HTTP ${conectarAjeno.status}`);
const callbackFalso = await fetch(`${URL_BASE}/functions/v1/google-calendar-callback?state=inventado&code=xxx`, { redirect: "manual" });
comprobar("E. El callback rechaza un state inventado", callbackFalso.status === 400, `HTTP ${callbackFalso.status}`);

// F. Recordatorios: sin el secreto del cron, 401
const cronSinSecreto = await pedir("/functions/v1/enviar-whatsapp-recordatorios", { metodo: "POST", cuerpo: {} });
comprobar("F. Los recordatorios exigen el secreto del cron", cronSinSecreto.status === 401, `HTTP ${cronSinSecreto.status}`);

// Limpieza: lo creado en el taller e2e se cancela por el panel (siempre) y se borra (con SR_KEY)
let canceladas = 0;
for (const id of creadas) {
  if (await cancelarComoTaller(id)) canceladas++;
}
comprobar(`Limpieza: ${creadas.length} reservas de prueba canceladas`, canceladas === creadas.length, `${canceladas}/${creadas.length}`);
if (SERVICE) {
  const borrar = await fetch(`${URL_BASE}/rest/v1/reservas?taller_id=eq.${TALLER_E2E}&id=in.(${creadas.join(",")})`, { method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  const borrarStates = await fetch(`${URL_BASE}/rest/v1/google_oauth_states?taller_id=eq.${TALLER_E2E}`, { method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  comprobar("Limpieza: reservas y states de prueba borrados", borrar.ok && borrarStates.ok, `${borrar.status} / ${borrarStates.status}`);
}

console.log(`\n${fallos === 0 ? "Todas las comprobaciones han pasado." : `${fallos} comprobación(es) han fallado.`}`);
process.exit(fallos === 0 ? 0 : 1);

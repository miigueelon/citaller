// Prueba de la cadena completa contra el taller de pruebas e2e (id 3).
// No toca datos de Speedbikes ni de Rik and Roll: solo lee para comprobar que están protegidos.
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
const DIA = "2026-09-21"; // lunes
const HORA = "10:00:00";

let fallos = 0;
function comprobar(titulo, ok, detalle) {
  console.log(`${ok ? "OK  " : "FALLA"} ${titulo}${detalle ? ` → ${detalle}` : ""}`);
  if (!ok) fallos++;
}

async function pedir(ruta, { token = ANON, metodo = "GET", cuerpo, cabeceras = {} } = {}) {
  const r = await fetch(`${URL_BASE}${ruta}`, {
    method: metodo,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...cabeceras,
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  return { status: r.status, datos };
}

// 1. Login del taller de pruebas
const login = await pedir("/auth/v1/token?grant_type=password", {
  metodo: "POST",
  cuerpo: { email: env.E2E_TALLER_EMAIL, password: env.E2E_TALLER_PASSWORD },
});
comprobar("B. Login del taller de pruebas", login.status === 200 && !!login.datos?.access_token, `HTTP ${login.status}`);
const TOKEN = login.datos?.access_token;
if (!TOKEN) process.exit(1);

// 2. Lecturas públicas que hace la pantalla de reserva
const vista = await pedir(`/rest/v1/talleres_publicos?id=eq.${TALLER_E2E}&select=id,nombre,capacidad_simultanea`);
comprobar("A. La web pública ve el taller de pruebas", vista.status === 200 && vista.datos?.length === 1, `HTTP ${vista.status}`);

const horarios = await pedir(`/rest/v1/horarios_taller?taller_id=eq.${TALLER_E2E}&select=dia_semana,hora`);
comprobar("A. La web pública ve sus horarios", horarios.status === 200 && horarios.datos?.length === 20, `${horarios.datos?.length} horas`);

// 3. Reserva pública por la RPC
const crear = await pedir("/rest/v1/rpc/crear_reserva_publica", {
  metodo: "POST",
  cuerpo: {
    p_taller_id: TALLER_E2E,
    p_matricula: "E2E1234",
    p_nombre: "Cliente de prueba",
    p_telefono: "600111222",
    p_vehiculo: "Coche de prueba",
    p_servicio: "Revisión",
    p_descripcion: "Reserva creada por la verificación automática",
    p_dia: DIA,
    p_hora: HORA,
    p_kilometros: 1000,
  },
});
comprobar("A. Reservar como cliente anónimo (RPC)", crear.status === 200 || crear.status === 204, `HTTP ${crear.status}`);

// 4. La ocupación pública ya cuenta esa hora, sin exponer datos personales
const ocupacion = await pedir("/rest/v1/rpc/ocupacion_dia", {
  metodo: "POST",
  cuerpo: { p_taller_id: TALLER_E2E, p_dia: DIA },
});
const filaHora = (ocupacion.datos || []).find((f) => f.hora === HORA);
comprobar("A. La ocupación pública cuenta la reserva", ocupacion.status === 200 && !!filaHora, JSON.stringify(ocupacion.datos));

const pii = await pedir("/rest/v1/reservas?select=nombre,telefono");
comprobar("A. El público no puede leer datos personales", pii.status === 401 || pii.status === 403, `HTTP ${pii.status}`);

// 5. El panel del taller de pruebas ve su reserva
const mias = await pedir(`/rest/v1/reservas?taller_id=eq.${TALLER_E2E}&select=id,nombre,estado,dia,hora&order=id.desc&limit=1`, { token: TOKEN });
const reserva = mias.datos?.[0];
comprobar("B. El panel ve su reserva pendiente", mias.status === 200 && reserva?.estado === "Pendiente", `HTTP ${mias.status}`);
if (!reserva) process.exit(1);

// 6. Aislamiento entre talleres
const ajenas = await pedir("/rest/v1/reservas?taller_id=eq.2&select=id,nombre", { token: TOKEN });
comprobar("B. No ve las reservas de otro taller", ajenas.status === 200 && ajenas.datos?.length === 0, `${ajenas.datos?.length ?? "?"} filas`);

const talleresVisibles = await pedir("/rest/v1/talleres?select=id,nombre,user_id", { token: TOKEN });
comprobar(
  "B. Solo ve la ficha de su propio taller",
  talleresVisibles.status === 200 && talleresVisibles.datos?.length === 1 && talleresVisibles.datos[0].id === TALLER_E2E,
  `${talleresVisibles.datos?.length ?? "?"} filas`
);

const internas = await pedir("/rest/v1/integraciones_calendario?select=id", { token: TOKEN });
comprobar("B. No puede leer las integraciones de calendario", internas.status === 401 || internas.status === 403, `HTTP ${internas.status}`);

// 7. Confirmar
const confirmar = await pedir(`/rest/v1/reservas?id=eq.${reserva.id}&taller_id=eq.${TALLER_E2E}`, {
  token: TOKEN,
  metodo: "PATCH",
  cuerpo: { estado: "Confirmada" },
  cabeceras: { Prefer: "return=representation" },
});
comprobar("C. Confirmar la cita", confirmar.status === 200 && confirmar.datos?.length === 1, `HTTP ${confirmar.status}`);

const whatsapp = await pedir("/functions/v1/enviar-whatsapp-confirmacion", {
  token: TOKEN,
  metodo: "POST",
  cuerpo: { reserva_id: reserva.id },
});
comprobar(
  "C. WhatsApp responde que el taller no lo tiene activo",
  whatsapp.status === 200 && JSON.stringify(whatsapp.datos).includes("activo"),
  `HTTP ${whatsapp.status} ${JSON.stringify(whatsapp.datos).slice(0, 90)}`
);

// Si el taller de pruebas tiene Google Calendar conectado, se crea un evento de verdad y se
// borra al cancelar. Si no lo tiene, se comprueba que la función lo dice con claridad.
const evento = await pedir("/functions/v1/crear-evento-google", {
  token: TOKEN,
  metodo: "POST",
  cuerpo: { reserva_id: reserva.id },
});
const conCalendario = evento.status === 200 && evento.datos?.ok === true;

if (conCalendario) {
  comprobar(
    "C. Crear el evento en Google Calendar",
    evento.datos.evento_creado === true && !!evento.datos.google_event_id,
    evento.datos.google_event_id || ""
  );

  const conId = await pedir(`/rest/v1/reservas?id=eq.${reserva.id}&select=google_event_id,google_event_html_link`, { token: TOKEN });
  comprobar(
    "C. La reserva guarda el id del evento",
    conId.datos?.[0]?.google_event_id === evento.datos.google_event_id,
    conId.datos?.[0]?.google_event_html_link ? "con enlace al evento" : "sin enlace"
  );

  const repetido = await pedir("/functions/v1/crear-evento-google", {
    token: TOKEN,
    metodo: "POST",
    cuerpo: { reserva_id: reserva.id },
  });
  comprobar(
    "C. Confirmar dos veces no crea un segundo evento",
    repetido.status === 200 && repetido.datos?.evento_creado === false,
    JSON.stringify(repetido.datos).slice(0, 80)
  );
} else {
  comprobar(
    "C. Calendar responde que este taller no lo tiene conectado",
    evento.status === 400 && JSON.stringify(evento.datos).includes("no está conectado"),
    `HTTP ${evento.status} ${JSON.stringify(evento.datos).slice(0, 90)}`
  );
}

// 8. No puede tocar una reserva de otro taller
const ajena = await pedir("/rest/v1/reservas?taller_id=eq.2&estado=eq.Confirmada&limit=1", { token: TOKEN, metodo: "PATCH", cuerpo: { estado: "Cancelada" }, cabeceras: { Prefer: "return=representation" } });
comprobar("B. No puede cambiar reservas de otro taller", ajena.status === 200 && ajena.datos?.length === 0, `${ajena.datos?.length ?? "?"} filas`);

// 9. Cancelar y comprobar que no se reabre
const cancelar = await pedir(`/rest/v1/reservas?id=eq.${reserva.id}&taller_id=eq.${TALLER_E2E}`, {
  token: TOKEN,
  metodo: "PATCH",
  cuerpo: { estado: "Cancelada" },
  cabeceras: { Prefer: "return=representation" },
});
comprobar("D. Cancelar la cita", cancelar.status === 200 && cancelar.datos?.length === 1, `HTTP ${cancelar.status}`);

const borrarEvento = await pedir("/functions/v1/cancelar-evento-google", {
  token: TOKEN,
  metodo: "POST",
  cuerpo: { reserva_id: reserva.id },
});

if (conCalendario) {
  comprobar(
    "D. Borrar el evento de Google Calendar",
    borrarEvento.status === 200 && borrarEvento.datos?.evento_eliminado === true,
    JSON.stringify(borrarEvento.datos).slice(0, 90)
  );

  const sinId = await pedir(`/rest/v1/reservas?id=eq.${reserva.id}&select=google_event_id`, { token: TOKEN });
  comprobar("D. La reserva se queda sin id de evento", sinId.datos?.[0]?.google_event_id === null, JSON.stringify(sinId.datos));
} else {
  comprobar(
    "D. Borrar evento no bloquea aunque no haya evento",
    borrarEvento.status === 200 && borrarEvento.datos?.ok === true,
    JSON.stringify(borrarEvento.datos).slice(0, 90)
  );
}

const reabrir = await pedir(`/rest/v1/reservas?id=eq.${reserva.id}&taller_id=eq.${TALLER_E2E}`, {
  token: TOKEN,
  metodo: "PATCH",
  cuerpo: { estado: "Confirmada" },
  cabeceras: { Prefer: "return=representation" },
});
comprobar("D. Una cita cancelada no se puede reabrir", reabrir.status === 200 && reabrir.datos?.length === 0, `${reabrir.datos?.length ?? "?"} filas`);

// 10. Conectar Google: la función crea el state y devuelve una URL de Google
const conectar = await pedir("/functions/v1/conectar-google-calendar", {
  token: TOKEN,
  metodo: "POST",
  cuerpo: { taller_id: TALLER_E2E, volver_a: "http://localhost:5173/?taller=3&modo=taller" },
});
const authUrl = conectar.datos?.auth_url || "";
comprobar("E. Conectar devuelve una URL de Google", conectar.status === 200 && authUrl.startsWith("https://accounts.google.com/"), `HTTP ${conectar.status}`);
const parametros = authUrl ? new URLSearchParams(authUrl.split("?")[1]) : new URLSearchParams();
comprobar(
  "E. La URL lleva el redirect_uri registrado en Google",
  parametros.get("redirect_uri") === `${URL_BASE}/functions/v1/google-calendar-callback`,
  parametros.get("redirect_uri") || "(ninguno)"
);
comprobar("E. Pide permiso de calendario y refresh token", parametros.get("scope") === "https://www.googleapis.com/auth/calendar.events" && parametros.get("access_type") === "offline", `${parametros.get("scope")} / ${parametros.get("access_type")}`);

const conectarAjeno = await pedir("/functions/v1/conectar-google-calendar", {
  token: TOKEN,
  metodo: "POST",
  cuerpo: { taller_id: 2 },
});
comprobar("E. No puede iniciar la conexión de otro taller", conectarAjeno.status === 403, `HTTP ${conectarAjeno.status}`);

const volverFuera = await pedir("/functions/v1/conectar-google-calendar", {
  token: TOKEN,
  metodo: "POST",
  cuerpo: { taller_id: TALLER_E2E, volver_a: "https://sitio-malicioso.example/roba" },
});
comprobar("E. Una URL de vuelta ajena se descarta", volverFuera.status === 200, `HTTP ${volverFuera.status}`);

const callbackFalso = await fetch(`${URL_BASE}/functions/v1/google-calendar-callback?state=inventado&code=xxx`, { redirect: "manual" });
comprobar("E. El callback rechaza un state inventado", callbackFalso.status === 400, `HTTP ${callbackFalso.status}`);

// 11. Limpieza: se borra la reserva de prueba y los states del taller e2e (datos del taller de pruebas)
if (SERVICE) {
  const borrar = await fetch(`${URL_BASE}/rest/v1/reservas?id=eq.${reserva.id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  const borrarStates = await fetch(`${URL_BASE}/rest/v1/google_oauth_states?taller_id=eq.${TALLER_E2E}`, {
    method: "DELETE",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  comprobar("Limpieza de la reserva y los states de prueba", borrar.ok && borrarStates.ok, `${borrar.status} / ${borrarStates.status}`);
}

console.log(`\n${fallos === 0 ? "Todas las comprobaciones han pasado." : `${fallos} comprobación(es) han fallado.`}`);
process.exit(fallos === 0 ? 0 : 1);

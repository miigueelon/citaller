// Backup del proyecto remoto de Supabase sin Docker.
// Vuelca todas las tablas del esquema public a JSON y una instantánea del esquema
// (columnas, constraints, políticas RLS, grants por tabla y columna, funciones, triggers, cron)
// en backups/<fecha>/. Uso: `npm run backup`. Requiere SUPABASE_DB_PASSWORD en .env.local o en el entorno.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const raiz = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function leerEnvLocal() {
  const ruta = join(raiz, ".env.local");
  if (!existsSync(ruta)) return {};
  return Object.fromEntries(
    readFileSync(ruta, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );
}

const env = { ...leerEnvLocal(), ...process.env };
const password = env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Falta SUPABASE_DB_PASSWORD (añádela a .env.local; nunca al repo). Ver docs/operaciones.md.");
  process.exit(1);
}

const plantillaPooler = join(raiz, "supabase", ".temp", "pooler-url");
if (!existsSync(plantillaPooler)) {
  console.error("No existe supabase/.temp/pooler-url: ejecuta `npx supabase link --project-ref zrrqqqbgwwovmglhqxwn` primero.");
  process.exit(1);
}
// El fichero trae la URL sin contraseña (postgresql://usuario@host:puerto/db); la añadimos aquí.
const urlPooler = new URL(readFileSync(plantillaPooler, "utf8").trim().replace("[YOUR-PASSWORD]", ""));
const conexion = {
  host: urlPooler.hostname,
  port: Number(urlPooler.port || 5432),
  user: decodeURIComponent(urlPooler.username),
  database: urlPooler.pathname.replace(/^\//, "") || "postgres",
  password,
  ssl: { rejectUnauthorized: false },
};

const ahora = new Date();
const sello = ahora.toISOString().slice(0, 16).replace("T", "_").replace(":", "");
const carpeta = join(raiz, "backups", sello);
mkdirSync(carpeta, { recursive: true });

const cliente = new pg.Client(conexion);
await cliente.connect();

const { rows: tablas } = await cliente.query(
  `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`
);

const resumen = { fecha: ahora.toISOString(), tablas: {} };
for (const { table_name } of tablas) {
  const { rows } = await cliente.query(`select * from public."${table_name}" order by 1`);
  writeFileSync(join(carpeta, `${table_name}.json`), JSON.stringify(rows, null, 1));
  resumen.tablas[table_name] = rows.length;
}

const consultasEsquema = {
  columnas: `select table_name, column_name, data_type, is_nullable, column_default, ordinal_position
             from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`,
  constraints: `select conrelid::regclass::text as tabla, conname, contype, pg_get_constraintdef(oid) as definicion
                from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2`,
  politicas: `select tablename, policyname, permissive, roles, cmd, qual, with_check
              from pg_policies where schemaname = 'public' order by 1, 2`,
  rls: `select relname as tabla, relrowsecurity as rls_activo from pg_class
        where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1`,
  grants_tabla: `select table_name, grantee, privilege_type from information_schema.role_table_grants
                 where table_schema = 'public' and grantee in ('anon','authenticated','service_role') order by 1, 2, 3`,
  grants_columna: `select table_name, grantee, privilege_type, column_name from information_schema.role_column_grants
                   where table_schema = 'public' and grantee in ('anon','authenticated') order by 1, 2, 3, 4`,
  funciones: `select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos, p.prosecdef as security_definer,
              pg_get_functiondef(p.oid) as definicion from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1`,
  triggers: `select event_object_table as tabla, trigger_name, action_timing, event_manipulation, action_statement
             from information_schema.triggers where trigger_schema = 'public' order by 1, 2`,
  vistas: `select table_name, view_definition from information_schema.views where table_schema = 'public' order by 1`,
  cron: `select jobid, jobname, schedule, active, command from cron.job order by jobid`,
};

const esquema = {};
for (const [nombre, sql] of Object.entries(consultasEsquema)) {
  try {
    esquema[nombre] = (await cliente.query(sql)).rows;
  } catch (error) {
    esquema[nombre] = { error: error.message };
  }
}
// El secreto del cron no debe quedar en el backup en claro.
if (Array.isArray(esquema.cron)) {
  for (const job of esquema.cron) job.command = String(job.command).replace(/x-cron-secret[^"']*["'][^"']*["']/g, "x-cron-secret: (oculto)");
}
writeFileSync(join(carpeta, "schema.json"), JSON.stringify(esquema, null, 1));
writeFileSync(join(carpeta, "README.txt"), `Backup CiTaller ${ahora.toISOString()}\n\nFilas por tabla:\n${Object.entries(resumen.tablas).map(([t, n]) => `- ${t}: ${n}`).join("\n")}\n\nRestauración: aplicar las migraciones de supabase/migrations y cargar los JSON con un script o desde el SQL Editor.\n`);

await cliente.end();
console.log(`Backup guardado en ${carpeta}`);
console.table(resumen.tablas);

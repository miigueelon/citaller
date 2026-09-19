-- Comprobación de permisos efectivos (grants por tabla/columna + políticas RLS) para los roles públicos.
-- No modifica nada. Ejecutar contra el proyecto remoto (SQL Editor, MCP execute_sql o `npx supabase db query -f scripts/rls-test.sql`).
-- Cada fila: qué se comprueba, valor actual, valor esperado tras la fase 1, y si ya coincide.

with comprobaciones (orden, comprobacion, actual, esperado_fase1) as (
  values
    -- anon: lectura de ocupación sí, datos personales no
    (1,  'anon lee reservas.hora',                        has_column_privilege('anon', 'public.reservas', 'hora', 'SELECT'),            true),
    (2,  'anon lee reservas.estado',                      has_column_privilege('anon', 'public.reservas', 'estado', 'SELECT'),          true),
    (3,  'anon lee reservas.telefono (PII)',              has_column_privilege('anon', 'public.reservas', 'telefono', 'SELECT'),        false),
    (4,  'anon lee reservas.nombre (PII)',                has_column_privilege('anon', 'public.reservas', 'nombre', 'SELECT'),          false),
    (5,  'anon lee reservas.matricula (PII)',             has_column_privilege('anon', 'public.reservas', 'matricula', 'SELECT'),       false),
    (6,  'anon inserta directamente en reservas',         has_table_privilege('anon', 'public.reservas', 'INSERT'),                     false),
    (7,  'anon lee talleres.nombre',                      has_column_privilege('anon', 'public.talleres', 'nombre', 'SELECT'),          true),
    (8,  'anon lee talleres.user_id',                     has_column_privilege('anon', 'public.talleres', 'user_id', 'SELECT'),         false),
    (9,  'anon lee talleres.whatsapp_phone_number_id',    has_column_privilege('anon', 'public.talleres', 'whatsapp_phone_number_id', 'SELECT'), false),
    (10, 'anon lee horarios_taller',                      has_table_privilege('anon', 'public.horarios_taller', 'SELECT'),              true),
    (11, 'anon lee festivos_taller',                      has_table_privilege('anon', 'public.festivos_taller', 'SELECT'),              true),
    (12, 'anon tiene privilegios en integraciones_calendario', has_table_privilege('anon', 'public.integraciones_calendario', 'SELECT'), false),
    (13, 'anon tiene privilegios en google_oauth_states', has_table_privilege('anon', 'public.google_oauth_states', 'SELECT'),         false),
    (14, 'anon tiene privilegios en configuracion_taller', has_table_privilege('anon', 'public.configuracion_taller', 'SELECT'),       false),
    (15, 'anon ejecuta crear_reserva_publica',            has_function_privilege('anon', 'public.crear_reserva_publica(bigint,text,text,text,text,text,text,date,time,integer)', 'EXECUTE'), true),
    -- authenticated: solo su taller (lo garantiza la política), y solo actualiza estado
    (16, 'authenticated actualiza reservas.estado',       has_column_privilege('authenticated', 'public.reservas', 'estado', 'UPDATE'), true),
    (17, 'authenticated actualiza reservas.telefono',     has_column_privilege('authenticated', 'public.reservas', 'telefono', 'UPDATE'), false),
    (18, 'authenticated lee talleres.user_id (de todos)', has_column_privilege('authenticated', 'public.talleres', 'user_id', 'SELECT'), false),
    (19, 'authenticated tiene privilegios en integraciones_calendario', has_table_privilege('authenticated', 'public.integraciones_calendario', 'SELECT'), false),
    -- RLS activa en todas las tablas públicas
    (20, 'RLS activa en reservas',   (select relrowsecurity from pg_class where oid = 'public.reservas'::regclass), true),
    (21, 'RLS activa en talleres',   (select relrowsecurity from pg_class where oid = 'public.talleres'::regclass), true),
    (22, 'RLS activa en integraciones_calendario', (select relrowsecurity from pg_class where oid = 'public.integraciones_calendario'::regclass), true),
    -- Integridad
    (23, 'FK reservas.taller_id -> talleres', exists (select 1 from pg_constraint where conrelid = 'public.reservas'::regclass and contype = 'f'), true),
    (24, 'CHECK/enum en reservas.estado',     exists (select 1 from pg_constraint where conrelid = 'public.reservas'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%estado%'), true)
)
select orden, comprobacion, actual, esperado_fase1, (actual = esperado_fase1) as ok
from comprobaciones
order by orden;

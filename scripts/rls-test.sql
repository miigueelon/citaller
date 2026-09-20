-- Comprobación de permisos efectivos (grants por tabla/columna + políticas RLS) para los roles
-- públicos. No modifica nada. Ejecutar contra el proyecto remoto (SQL Editor, MCP execute_sql
-- o `npx supabase db query -f scripts/rls-test.sql`).
-- Cada fila: qué se comprueba, valor actual, valor esperado y si coincide.
--
-- "esperado" = estado objetivo al cerrar la fase 3. Las dos comprobaciones marcadas como
-- (despliegue) no pueden cumplirse hasta que el frontend nuevo esté en producción: el que hay
-- hoy en producción inserta directamente en `reservas` y lee (dia, hora, estado) de esa tabla.
-- Ver docs/plan.md, "Pendiente del despliegue".

with comprobaciones (orden, comprobacion, actual, esperado) as (
  values
    -- anon: ocupación sí (por RPC), datos personales no
    (1,  'anon lee reservas.telefono (PII)',              has_column_privilege('anon', 'public.reservas', 'telefono', 'SELECT'),        false),
    (2,  'anon lee reservas.nombre (PII)',                has_column_privilege('anon', 'public.reservas', 'nombre', 'SELECT'),          false),
    (3,  'anon lee reservas.matricula (PII)',             has_column_privilege('anon', 'public.reservas', 'matricula', 'SELECT'),       false),
    (4,  'anon ejecuta ocupacion_dia',                    has_function_privilege('anon', 'public.ocupacion_dia(bigint,date)', 'EXECUTE'), true),
    (5,  'anon ejecuta crear_reserva_publica',            has_function_privilege('anon', 'public.crear_reserva_publica(bigint,text,text,text,text,text,text,date,time,jsonb)', 'EXECUTE'), true),
    (6,  'anon lee la vista talleres_publicos',           has_table_privilege('anon', 'public.talleres_publicos', 'SELECT'),            true),
    (7,  'anon lee talleres.user_id',                     has_column_privilege('anon', 'public.talleres', 'user_id', 'SELECT'),         false),
    (8,  'anon lee talleres.whatsapp_phone_number_id',    has_column_privilege('anon', 'public.talleres', 'whatsapp_phone_number_id', 'SELECT'), false),
    (9,  'anon lee horarios_taller',                      has_table_privilege('anon', 'public.horarios_taller', 'SELECT'),              true),
    (10, 'anon lee festivos_taller',                      has_table_privilege('anon', 'public.festivos_taller', 'SELECT'),              true),
    -- tablas internas: solo service_role
    (11, 'anon tiene privilegios en integraciones_calendario', has_table_privilege('anon', 'public.integraciones_calendario', 'SELECT'), false),
    (12, 'anon tiene privilegios en google_oauth_states', has_table_privilege('anon', 'public.google_oauth_states', 'SELECT'),         false),
    (13, 'anon lee talleres.texto_whatsapp_confirmacion', has_column_privilege('anon', 'public.talleres', 'texto_whatsapp_confirmacion', 'SELECT'), false),
    (14, 'authenticated tiene privilegios en integraciones_calendario', has_table_privilege('authenticated', 'public.integraciones_calendario', 'SELECT'), false),
    (15, 'authenticated tiene privilegios en google_oauth_states', has_table_privilege('authenticated', 'public.google_oauth_states', 'SELECT'), false),
    -- las funciones de Vault solo las ejecuta service_role
    (16, 'anon ejecuta leer_token_calendario',            has_function_privilege('anon', 'public.leer_token_calendario(bigint,text)', 'EXECUTE'), false),
    (17, 'authenticated ejecuta leer_token_calendario',   has_function_privilege('authenticated', 'public.leer_token_calendario(bigint,text)', 'EXECUTE'), false),
    (18, 'authenticated ejecuta guardar_token_calendario', has_function_privilege('authenticated', 'public.guardar_token_calendario(bigint,text,text,text)', 'EXECUTE'), false),
    (19, 'service_role ejecuta leer_token_calendario',    has_function_privilege('service_role', 'public.leer_token_calendario(bigint,text)', 'EXECUTE'), true),
    -- authenticated: solo actualiza estado; el taller lo limita la política RLS
    (20, 'authenticated actualiza reservas.estado',       has_column_privilege('authenticated', 'public.reservas', 'estado', 'UPDATE'), true),
    (21, 'authenticated actualiza reservas.telefono',     has_column_privilege('authenticated', 'public.reservas', 'telefono', 'UPDATE'), false),
    -- RLS activa en todas las tablas
    (22, 'RLS activa en reservas',   (select relrowsecurity from pg_class where oid = 'public.reservas'::regclass), true),
    (23, 'RLS activa en talleres',   (select relrowsecurity from pg_class where oid = 'public.talleres'::regclass), true),
    (24, 'RLS activa en integraciones_calendario', (select relrowsecurity from pg_class where oid = 'public.integraciones_calendario'::regclass), true),
    -- integridad
    (25, 'FK reservas.taller_id -> talleres', exists (select 1 from pg_constraint where conrelid = 'public.reservas'::regclass and contype = 'f'), true),
    (26, 'CHECK en reservas.estado',          exists (select 1 from pg_constraint where conrelid = 'public.reservas'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%estado%'), true),
    (27, 'reservas.taller_id es NOT NULL',    (select attnotnull from pg_attribute where attrelid = 'public.reservas'::regclass and attname = 'taller_id'), true),
    -- search_path fijo en las funciones propias
    (28, 'trigger comprobar_capacidad con search_path fijo', exists (select 1 from pg_proc where oid = 'public.comprobar_capacidad()'::regprocedure and proconfig is not null), true),
    (29, 'ocupacion_dia con search_path fijo', exists (select 1 from pg_proc where oid = 'public.ocupacion_dia(bigint,date)'::regprocedure and proconfig is not null), true),
    -- política de transición de estado (no se puede reabrir una reserva cancelada)
    (30, 'la política UPDATE exige estado previo abierto', exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'reservas' and cmd = 'UPDATE'
             and qual ilike '%estado%'), true),
    -- pendientes del despliegue del frontend nuevo
    (31, 'anon no tiene INSERT de tabla en reservas (solo por columnas hasta la fase 4)', has_table_privilege('anon', 'public.reservas', 'INSERT'), false),
    (32, '(despliegue) anon lee reservas.hora',               has_column_privilege('anon', 'public.reservas', 'hora', 'SELECT'),        false),
    (33, '(despliegue) authenticated lee talleres.user_id',   has_column_privilege('authenticated', 'public.talleres', 'user_id', 'SELECT'), false),
    -- correcciones de la revisión independiente de la fase 1
    (34, 'el trigger de aforo es SECURITY DEFINER',       (select prosecdef from pg_proc where oid = 'public.comprobar_capacidad()'::regprocedure), true),
    (35, 'la política pública de talleres exige activo',  exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'talleres' and 'anon' = any(roles) and qual ilike '%activo%'), true),
    -- fase 3: configuración por taller, enlace del cliente y citas manuales
    (36, 'anon lee reservas.token_publico',               has_column_privilege('anon', 'public.reservas', 'token_publico', 'SELECT'),   false),
    (37, 'anon inserta reservas.creada_por',              has_column_privilege('anon', 'public.reservas', 'creada_por', 'INSERT'),      false),
    (38, 'anon inserta reservas.token_publico',           has_column_privilege('anon', 'public.reservas', 'token_publico', 'INSERT'),   false),
    (39, 'la política INSERT de anon exige creada_por cliente', exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'reservas' and cmd = 'INSERT' and 'anon' = any(roles)
             and with_check ilike '%creada_por%'), true),
    (40, 'anon lee servicios_taller',                     has_table_privilege('anon', 'public.servicios_taller', 'SELECT'),             true),
    (41, 'anon escribe servicios_taller',                 has_table_privilege('anon', 'public.servicios_taller', 'INSERT'),             false),
    (42, 'anon lee campos_formulario_taller',             has_table_privilege('anon', 'public.campos_formulario_taller', 'SELECT'),     true),
    (43, 'anon ejecuta insertar_reserva_taller',          has_function_privilege('anon', 'public.insertar_reserva_taller(bigint,text,text,text,text,text,text,date,time,jsonb)', 'EXECUTE'), false),
    (44, 'authenticated ejecuta insertar_reserva_taller', has_function_privilege('authenticated', 'public.insertar_reserva_taller(bigint,text,text,text,text,text,text,date,time,jsonb)', 'EXECUTE'), false),
    (45, 'anon ejecuta consultar_cita_cliente',           has_function_privilege('anon', 'public.consultar_cita_cliente(uuid)', 'EXECUTE'), true),
    (46, 'anon ejecuta cancelar_reserva_cliente',         has_function_privilege('anon', 'public.cancelar_reserva_cliente(uuid)', 'EXECUTE'), false),
    (47, 'authenticated ejecuta cancelar_reserva_cliente', has_function_privilege('authenticated', 'public.cancelar_reserva_cliente(uuid)', 'EXECUTE'), false),
    (48, 'anon ejecuta validar_datos_reserva',            has_function_privilege('anon', 'public.validar_datos_reserva(bigint,text,text,date,time,text,text,jsonb,boolean)', 'EXECUTE'), false),
    (49, 'consultar_cita_cliente no devuelve el teléfono del cliente', (
           select pg_get_functiondef('public.consultar_cita_cliente(uuid)'::regprocedure) not ilike '%r.telefono%'), true),
    (50, 'RLS activa en servicios_taller', (select relrowsecurity from pg_class where oid = 'public.servicios_taller'::regclass), true),
    (51, 'RLS activa en campos_formulario_taller', (select relrowsecurity from pg_class where oid = 'public.campos_formulario_taller'::regclass), true)
)
select orden, comprobacion, actual, esperado, (actual = esperado) as ok
from comprobaciones
order by orden;

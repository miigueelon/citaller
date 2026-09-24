-- Comprobación de permisos efectivos (grants por tabla/columna + políticas RLS) para los roles
-- públicos. No modifica nada. Ejecutar contra el proyecto remoto (SQL Editor, MCP execute_sql
-- o `npx supabase db query -f scripts/rls-test.sql`).
-- Cada fila: qué se comprueba, valor actual, valor esperado y si coincide.
--
-- "esperado" = estado objetivo al cerrar la fase 4 (migración `cierre_permisos_publicos`, que se
-- aplica después de desplegar el frontend nuevo): anon y authenticated no escriben en `reservas`
-- por REST; solo las RPC y las Edge Functions (service_role) lo hacen.

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
    -- authenticated: lee sus reservas, pero solo escribe por las Edge Functions (fase 4)
    (20, 'authenticated actualiza reservas.estado por REST', has_column_privilege('authenticated', 'public.reservas', 'estado', 'UPDATE'), false),
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
    -- desde la fase 4 nadie escribe en reservas por REST: ni políticas de INSERT/UPDATE para anon o authenticated
    (30, 'no queda política de INSERT ni UPDATE en reservas para anon/authenticated', exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'reservas' and cmd in ('INSERT', 'UPDATE')
             and (roles && array['anon', 'authenticated']::name[])), false),
    (31, 'anon no tiene INSERT en reservas',              has_table_privilege('anon', 'public.reservas', 'INSERT'),                     false),
    (32, 'anon lee reservas.hora (la ocupación va por la RPC)', has_column_privilege('anon', 'public.reservas', 'hora', 'SELECT'),      false),
    (33, 'la política SELECT de talleres para authenticated exige user_id = auth.uid()', exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'talleres' and cmd = 'SELECT' and 'authenticated' = any(roles)
             and qual ilike '%user_id%' and qual ilike '%auth.uid()%'), true),
    -- correcciones de la revisión independiente de la fase 1
    (34, 'el trigger de aforo es SECURITY DEFINER',       (select prosecdef from pg_proc where oid = 'public.comprobar_capacidad()'::regprocedure), true),
    (35, 'la política pública de talleres exige activo',  exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'talleres' and 'anon' = any(roles) and qual ilike '%activo%'), true),
    -- fase 3: configuración por taller, enlace del cliente y citas manuales
    (36, 'anon lee reservas.token_publico',               has_column_privilege('anon', 'public.reservas', 'token_publico', 'SELECT'),   false),
    (37, 'anon inserta reservas.creada_por',              has_column_privilege('anon', 'public.reservas', 'creada_por', 'INSERT'),      false),
    (38, 'anon inserta reservas.token_publico',           has_column_privilege('anon', 'public.reservas', 'token_publico', 'INSERT'),   false),
    (39, 'ya no hay política INSERT de anon en reservas (fase 4)', exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'reservas' and cmd = 'INSERT' and 'anon' = any(roles)), false),
    (40, 'anon lee servicios_taller',                     has_table_privilege('anon', 'public.servicios_taller', 'SELECT'),             true),
    (41, 'anon escribe servicios_taller',                 has_table_privilege('anon', 'public.servicios_taller', 'INSERT'),             false),
    (42, 'anon lee campos_formulario_taller',             has_table_privilege('anon', 'public.campos_formulario_taller', 'SELECT'),     true),
    (43, 'anon ejecuta insertar_reserva_taller',          has_function_privilege('anon', 'public.insertar_reserva_taller(bigint,text,text,text,text,text,text,date,time,jsonb,bigint)', 'EXECUTE'), false),
    (44, 'authenticated ejecuta insertar_reserva_taller', has_function_privilege('authenticated', 'public.insertar_reserva_taller(bigint,text,text,text,text,text,text,date,time,jsonb,bigint)', 'EXECUTE'), false),
    (45, 'anon ejecuta consultar_cita_cliente',           has_function_privilege('anon', 'public.consultar_cita_cliente(uuid)', 'EXECUTE'), true),
    (46, 'anon ejecuta cancelar_reserva_cliente',         has_function_privilege('anon', 'public.cancelar_reserva_cliente(uuid)', 'EXECUTE'), false),
    (47, 'authenticated ejecuta cancelar_reserva_cliente', has_function_privilege('authenticated', 'public.cancelar_reserva_cliente(uuid)', 'EXECUTE'), false),
    (48, 'anon ejecuta validar_datos_reserva',            has_function_privilege('anon', 'public.validar_datos_reserva(bigint,text,text,date,time,text,text,jsonb,boolean)', 'EXECUTE'), false),
    (49, 'consultar_cita_cliente no devuelve el teléfono del cliente', (
           select pg_get_functiondef('public.consultar_cita_cliente(uuid)'::regprocedure) not ilike '%r.telefono%'), true),
    (50, 'RLS activa en servicios_taller', (select relrowsecurity from pg_class where oid = 'public.servicios_taller'::regclass), true),
    (51, 'RLS activa en campos_formulario_taller', (select relrowsecurity from pg_class where oid = 'public.campos_formulario_taller'::regclass), true),
    -- fase 4: cierre de permisos públicos
    (52, 'anon no tiene INSERT por columnas en reservas', exists (
           select 1 from information_schema.role_column_grants
           where grantee = 'anon' and table_schema = 'public' and table_name = 'reservas' and privilege_type = 'INSERT'), false),
    (53, 'authenticated no tiene INSERT en reservas (solo por Edge Functions)', has_table_privilege('authenticated', 'public.reservas', 'INSERT'), false),
    (54, 'authenticated no tiene UPDATE en reservas (solo por Edge Functions)', has_table_privilege('authenticated', 'public.reservas', 'UPDATE'), false),
    (55, 'authenticated sigue leyendo sus reservas',      has_table_privilege('authenticated', 'public.reservas', 'SELECT'),            true),
    (56, 'la vista pública ya no expone capacidad_simultanea', exists (
           select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'talleres_publicos' and column_name = 'capacidad_simultanea'), false),
    (57, 'talleres ya no tiene whatsapp_activo',          exists (
           select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'talleres' and column_name = 'whatsapp_activo'), false),
    -- 21-sep: tope diario y miembros del taller
    (58, 'anon lee talleres.max_citas_dia (vista security_invoker)', has_column_privilege('anon', 'public.talleres', 'max_citas_dia', 'SELECT'), true),
    (59, 'la vista pública expone max_citas_dia',         exists (
           select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'talleres_publicos' and column_name = 'max_citas_dia'), true),
    (60, 'RLS activa en miembros_taller', (select relrowsecurity from pg_class where oid = 'public.miembros_taller'::regclass), true),
    (61, 'anon no lee miembros_taller (nombres del personal)', has_table_privilege('anon', 'public.miembros_taller', 'SELECT'), false),
    (62, 'authenticated lee miembros_taller',             has_table_privilege('authenticated', 'public.miembros_taller', 'SELECT'),     true),
    (63, 'authenticated no escribe miembros_taller',      has_table_privilege('authenticated', 'public.miembros_taller', 'INSERT')
           or has_table_privilege('authenticated', 'public.miembros_taller', 'UPDATE')
           or has_table_privilege('authenticated', 'public.miembros_taller', 'DELETE'), false),
    (64, 'SELECT de miembros_taller exige user_id = auth.uid()', exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'miembros_taller' and cmd = 'SELECT' and 'authenticated' = any(roles)
             and qual ilike '%user_id%' and qual ilike '%auth.uid()%'), true),
    (65, 'comprobar_capacidad aplica el tope diario (CT018)', (
           select pg_get_functiondef('public.comprobar_capacidad()'::regprocedure) ilike '%max_citas_dia%CT018%'), true),
    (66, 'anon lee talleres.texto_whatsapp_listo',      has_column_privilege('anon', 'public.talleres', 'texto_whatsapp_listo', 'SELECT'), false),
    (67, 'authenticated lee talleres.texto_whatsapp_listo (su panel)', has_column_privilege('authenticated', 'public.talleres', 'texto_whatsapp_listo', 'SELECT'), true),
    -- 22-sep: "Vehículo listo" termina la cita
    (68, 'anon ejecuta marcar_vehiculo_listo',            has_function_privilege('anon', 'public.marcar_vehiculo_listo(bigint,boolean)', 'EXECUTE'), false),
    (69, 'authenticated ejecuta marcar_vehiculo_listo (su panel)', has_function_privilege('authenticated', 'public.marcar_vehiculo_listo(bigint,boolean)', 'EXECUTE'), true),
    (70, 'marcar_vehiculo_listo tiene search_path fijo',  (select proconfig is not null from pg_proc where oid = 'public.marcar_vehiculo_listo(bigint,boolean)'::regprocedure), true),
    (71, 'marcar_vehiculo_listo solo toca citas del taller de auth.uid()', (
           select pg_get_functiondef('public.marcar_vehiculo_listo(bigint,boolean)'::regprocedure) ilike '%user_id = (select auth.uid())%'), true),
    (72, 'authenticated sigue sin UPDATE en reservas.listo_en (solo por la función)', has_column_privilege('authenticated', 'public.reservas', 'listo_en', 'UPDATE'), false),
    -- 22-sep: avisos de WhatsApp apuntados desde el panel (modo enlace)
    (73, 'anon ejecuta marcar_aviso_whatsapp',            has_function_privilege('anon', 'public.marcar_aviso_whatsapp(bigint,text)', 'EXECUTE'), false),
    (74, 'authenticated ejecuta marcar_aviso_whatsapp (su panel)', has_function_privilege('authenticated', 'public.marcar_aviso_whatsapp(bigint,text)', 'EXECUTE'), true),
    (75, 'marcar_aviso_whatsapp tiene search_path fijo y filtra por auth.uid()', (
           select proconfig is not null and pg_get_functiondef(oid) ilike '%user_id = (select auth.uid())%'
           from pg_proc where oid = 'public.marcar_aviso_whatsapp(bigint,text)'::regprocedure), true),
    (76, 'authenticated lee reservas.whatsapp_recordatorio_fecha (su panel)', has_column_privilege('authenticated', 'public.reservas', 'whatsapp_recordatorio_fecha', 'SELECT'), true),
    -- 23-sep: antelación por servicio (Neumáticos de Rik and Roll). Los casos con fecha usan el taller
    -- e2e (id 3): L-V 9-12 (bloque 1) y 16-17 (bloque 2), festivo el 25-dic, Neumáticos con 1 bloque.
    (77, 'anon ejecuta antelacion_minima (la web)',        has_function_privilege('anon', 'public.antelacion_minima(bigint,bigint)', 'EXECUTE'), true),
    (78, 'anon ejecuta antelacion_minima_en (interna, con la hora como parámetro)', has_function_privilege('anon', 'public.antelacion_minima_en(bigint,bigint,timestamptz)', 'EXECUTE'), false),
    (79, 'antelacion_minima es SECURITY DEFINER con search_path fijo', (
           select prosecdef and proconfig is not null from pg_proc where oid = 'public.antelacion_minima(bigint,bigint)'::regprocedure), true),
    (80, 'anon lee horarios_taller.bloque',                has_column_privilege('anon', 'public.horarios_taller', 'bloque', 'SELECT'), true),
    (81, 'anon lee servicios_taller.bloques_antelacion y antelacion_texto', has_column_privilege('anon', 'public.servicios_taller', 'bloques_antelacion', 'SELECT')
           and has_column_privilege('anon', 'public.servicios_taller', 'antelacion_texto', 'SELECT'), true),
    (82, 'validar_datos_reserva aplica la antelación solo a clientes (CT021)', (
           select pg_get_functiondef('public.validar_datos_reserva(bigint,text,text,date,time,text,text,jsonb,boolean)'::regprocedure)
                  ilike '%if not p_es_taller then%antelacion_minima_en%CT021%'), true),
    (83, 'e2e: un servicio sin antelación no tiene primera hora (null)', (
           select public.antelacion_minima_en(3, s.id, now()) is null from public.servicios_taller s where s.taller_id = 3 and s.nombre = 'Frenos'), true),
    (84, 'e2e Neumáticos: solicitud lunes 22:00 → martes 16:00 (la mañana es para recibirlos)', (
           select public.antelacion_minima_en(3, s.id, timestamp '2026-11-09 22:00' at time zone 'Europe/Madrid') = timestamp '2026-11-10 16:00'
           from public.servicios_taller s where s.taller_id = 3 and s.nombre = 'Neumáticos'), true),
    (85, 'e2e Neumáticos: solicitud martes 10:00 (mañana abierta) → martes 16:00', (
           select public.antelacion_minima_en(3, s.id, timestamp '2026-11-10 10:00' at time zone 'Europe/Madrid') = timestamp '2026-11-10 16:00'
           from public.servicios_taller s where s.taller_id = 3 and s.nombre = 'Neumáticos'), true),
    (86, 'e2e Neumáticos: solicitud martes 16:30 (tarde abierta) → miércoles 09:00', (
           select public.antelacion_minima_en(3, s.id, timestamp '2026-11-10 16:30' at time zone 'Europe/Madrid') = timestamp '2026-11-11 09:00'
           from public.servicios_taller s where s.taller_id = 3 and s.nombre = 'Neumáticos'), true),
    (87, 'e2e Neumáticos: solicitud martes 13:00 (entre bloques) → miércoles 09:00', (
           select public.antelacion_minima_en(3, s.id, timestamp '2026-11-10 13:00' at time zone 'Europe/Madrid') = timestamp '2026-11-11 09:00'
           from public.servicios_taller s where s.taller_id = 3 and s.nombre = 'Neumáticos'), true),
    (88, 'e2e Neumáticos: solicitud viernes 16:30 → lunes 09:00', (
           select public.antelacion_minima_en(3, s.id, timestamp '2026-11-13 16:30' at time zone 'Europe/Madrid') = timestamp '2026-11-16 09:00'
           from public.servicios_taller s where s.taller_id = 3 and s.nombre = 'Neumáticos'), true),
    (89, 'e2e Neumáticos: solicitud sábado → lunes 16:00', (
           select public.antelacion_minima_en(3, s.id, timestamp '2026-11-14 11:00' at time zone 'Europe/Madrid') = timestamp '2026-11-16 16:00'
           from public.servicios_taller s where s.taller_id = 3 and s.nombre = 'Neumáticos'), true),
    (90, 'e2e Neumáticos: con festivo por medio (jueves 24-dic 22:00; el 25 cierra) → lunes 28-dic 16:00', (
           select public.antelacion_minima_en(3, s.id, timestamp '2026-12-24 22:00' at time zone 'Europe/Madrid') = timestamp '2026-12-28 16:00'
           from public.servicios_taller s where s.taller_id = 3 and s.nombre = 'Neumáticos'), true),
    (91, 'antelacion_minima devuelve null para un taller inexistente', public.antelacion_minima(999, 1) is null, true),
    -- 23-sep: el panel sabe si Google Calendar está conectado, sin ver el token.
    (92, 'anon ejecuta estado_calendario',                 has_function_privilege('anon', 'public.estado_calendario(bigint)', 'EXECUTE'), false),
    (93, 'authenticated ejecuta estado_calendario (su panel)', has_function_privilege('authenticated', 'public.estado_calendario(bigint)', 'EXECUTE'), true),
    (94, 'estado_calendario es SECURITY DEFINER, search_path fijo y filtra por auth.uid()', (
           select prosecdef and proconfig is not null and pg_get_functiondef(oid) ilike '%user_id = (select auth.uid())%'
           from pg_proc where oid = 'public.estado_calendario(bigint)'::regprocedure), true),
    (95, 'estado_calendario no devuelve nada sin sesión (aunque el taller e2e esté conectado)', (
           select count(*) = 0 from public.estado_calendario(3)), true),
    (96, 'authenticated sigue sin leer integraciones_calendario', has_table_privilege('authenticated', 'public.integraciones_calendario', 'SELECT'), false),
    -- 24-sep: datos obligatorios en el mostrador (por taller) y opciones propias del panel.
    (97, 'anon lee talleres.mostrador_datos_obligatorios',  has_column_privilege('anon', 'public.talleres', 'mostrador_datos_obligatorios', 'SELECT'), false),
    (98, 'authenticated lee talleres.mostrador_datos_obligatorios (su panel)', has_column_privilege('authenticated', 'public.talleres', 'mostrador_datos_obligatorios', 'SELECT'), true),
    (99, 'e2e: Neumáticos ofrece 2 y 4 al público y de 1 a 4 en el panel', (
           select c.opciones = '["2", "4"]'::jsonb and c.opciones_panel = '["1", "2", "3", "4"]'::jsonb
           from public.campos_formulario_taller c where c.taller_id = 3 and c.clave = 'cantidad_neumaticos'), true),
    (100, 'insertar_reserva_taller sigue siendo solo de service_role', has_function_privilege('authenticated', 'public.insertar_reserva_taller(bigint,text,text,text,text,text,text,date,time,jsonb,bigint)', 'EXECUTE'), false),
    -- 24-sep (noche): la web exige nombre y apellido (CT023) y sigue siendo pública.
    (101, 'crear_reserva_publica exige nombre con apellido (CT023)', (select pg_get_functiondef(oid) like '%CT023%' from pg_proc where oid = 'public.crear_reserva_publica(bigint,text,text,text,text,text,text,date,time,jsonb)'::regprocedure), true),
    (102, 'anon sigue ejecutando crear_reserva_publica', has_function_privilege('anon', 'public.crear_reserva_publica(bigint,text,text,text,text,text,text,date,time,jsonb)', 'EXECUTE'), true),
    (103, 'Speed Bikes y Rik and Roll: Avería y Otro con descripción obligatoria', (
           select count(*) = 4 from public.servicios_taller s join public.talleres t on t.id = s.taller_id
           where t.slug in ('speedbikes', 'rikandroll') and s.nombre in ('Avería / luz de aviso', 'Otro') and s.descripcion_modo = 'obligatoria'), true)
)
select orden, comprobacion, actual, esperado, (actual = esperado) as ok
from comprobaciones
order by orden;

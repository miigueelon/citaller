-- Días de cierre en Google Calendar (pedido de Miguel, 26-sep-2026): cada festivo o semana de
-- vacaciones de festivos_taller aparece en el Google Calendar del taller como "🔒 Taller cerrado · …"
-- (día completo, ocupado). Lo hace la Edge Function sincronizar-cierres-calendario, que crea lo que
-- falta y borra lo que ya no está (solo sus propios eventos). Aquí solo el job de cada noche, igual
-- que citaller-recordatorios-whatsapp: URL y secreto se leen de Vault en cada ejecución.
-- 02:00 UTC = 03:00/04:00 en Madrid, cuando no hay nadie usando el panel.
-- No cambia ninguna tabla. Para quitarlo: select cron.unschedule('citaller-cierres-calendario');

select cron.schedule(
  'citaller-cierres-calendario',
  '0 2 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'citaller_project_url')
           || '/functions/v1/sincronizar-cierres-calendario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'citaller_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);

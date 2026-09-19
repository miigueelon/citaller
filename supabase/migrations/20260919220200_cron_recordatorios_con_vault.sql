-- ============================================================================
-- FASE 1.2 (docs/plan.md): job diario de recordatorios de WhatsApp creado por migración, con el
-- secreto en Vault en lugar de en claro dentro del comando del job.
--
-- Antes: job `recordatorio-whatsapp-diario` → Edge Function `hyper-processor` (verify_jwt=true,
-- el cron no manda JWT → 401 cada mañana). Ahora: job `citaller-recordatorios-whatsapp` →
-- Edge Function `enviar-whatsapp-recordatorios` (verify_jwt=false; se autoriza con la cabecera
-- x-cron-secret, que debe coincidir con el secreto CITALLER_CRON_SECRET de Edge Functions).
--
-- El valor del secreto nunca aparece en el repositorio: se copia del job antiguo a Vault.
-- En un proyecto nuevo (sin job antiguo) hay que crearlo a mano una vez:
--   select vault.create_secret('<mismo valor que CITALLER_CRON_SECRET>', 'citaller_cron_secret');
-- y actualizar 'citaller_project_url' si el proyecto no es zrrqqqbgwwovmglhqxwn.
-- ============================================================================

do $$
declare
  v_comando text;
  v_secreto text;
begin
  if not exists (select 1 from vault.secrets where name = 'citaller_cron_secret') then
    select j.command into v_comando from cron.job j where j.jobname = 'recordatorio-whatsapp-diario';
    v_secreto := substring(v_comando from '"x-cron-secret"\s*:\s*"([^"]+)"');

    if v_secreto is null then
      raise notice 'No se encontró el secreto del cron en el job antiguo: crea el secreto de Vault citaller_cron_secret a mano.';
    else
      perform vault.create_secret(
        v_secreto,
        'citaller_cron_secret',
        'Cabecera x-cron-secret del job de recordatorios; igual que el secreto CITALLER_CRON_SECRET de Edge Functions'
      );
    end if;
  end if;

  if not exists (select 1 from vault.secrets where name = 'citaller_project_url') then
    perform vault.create_secret(
      'https://zrrqqqbgwwovmglhqxwn.supabase.co',
      'citaller_project_url',
      'URL del proyecto de Supabase que usan los jobs de pg_cron'
    );
  end if;

  if exists (select 1 from cron.job where jobname = 'recordatorio-whatsapp-diario') then
    perform cron.unschedule('recordatorio-whatsapp-diario');
  end if;
end;
$$;

-- 08:00 UTC = 10:00 en Madrid en verano y 09:00 en invierno.
select cron.schedule(
  'citaller-recordatorios-whatsapp',
  '0 8 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'citaller_project_url')
           || '/functions/v1/enviar-whatsapp-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'citaller_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);

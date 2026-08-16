-- Run this once in the Supabase SQL editor (NOT part of the automatic
-- migration set — it embeds a project-specific value you must fill in first).
--
-- 1. Deploy the function:      supabase functions deploy send-reminders
-- 2. Set its secrets:          supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com REMINDER_TIMEZONE=Europe/Helsinki
-- 3. Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> below, then run this file.
--
-- The service role key is stored in Supabase Vault (encrypted at rest) rather
-- than pasted directly into the cron job body, so it never sits in plaintext
-- in `cron.job` — only the secret's name does, and the value is decrypted
-- only at call time.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key', 'Service role key for cron-invoked edge functions');

select cron.schedule(
  'send-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To rotate the key later:
-- select vault.update_secret((select id from vault.secrets where name = 'service_role_key'), '<NEW_SERVICE_ROLE_KEY>');
--
-- To stop the schedule:
-- select cron.unschedule('send-reminders-every-minute');

-- Enable pg_cron and pg_net (Supabase projects typically have these available).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace the URL with your project function endpoint after deploying.
-- Format: https://<project-ref>.functions.supabase.co/auto-checks
select
  cron.schedule(
    'auto-checks-daily',
    '0 8 * * *',
    $$select net.http_post(
      url := 'https://sozhqlklayfhoibxkjgo.functions.supabase.co/auto-checks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
      ),
      body := '{}'::jsonb
    );$$
  );

-- ==============================================================================
-- 👻 SETUP GHOST BUSTER (LEAD RECOVERY) CRON JOB
-- ==============================================================================
-- Este script configura um agendamento no Supabase para rodar a função 'recover-leads'
-- a cada 1 HORA.

-- 1. Habilitar a extensão pg_cron (se ainda não estiver ativa)
create extension if not exists pg_cron;
create extension if not exists pg_net; -- Necessário para chamar a Edge Function

-- 2. Agendar o Job
-- ATENÇÃO: Substitua <PROJECT_REF> e <SERVICE_ROLE_KEY> pelos seus dados reais!
-- Encontre em: Project Settings -> API

select cron.schedule(
    'recover-leads-hourly', -- Nome do Job
    '0 * * * *',            -- Cronômetro (Toda hora no minuto 0)
    $$
    select
        net.http_post(
            url:='https://<PROJECT_REF>.supabase.co/functions/v1/recover-leads',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- 3. Verificar se foi agendado
select * from cron.job;

-- ==============================================================================
-- 🗑️ PARA REMOVER O AGENDAMENTO (SE PRECISAR):
-- select cron.unschedule('recover-leads-hourly');
-- ==============================================================================

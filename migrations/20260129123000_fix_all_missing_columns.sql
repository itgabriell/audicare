-- Migration: Fix Scheduling and Chatwoot Columns
-- Runs idempotently to ensure all necessary columns exist

-- 1. Ensure 'leads' table has 'last_activity_at'
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added last_activity_at to leads';
    END IF;
END $$;

-- 2. Ensure 'appointments' table has tracking columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'arrival_time'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN arrival_time TIMESTAMPTZ;
        RAISE NOTICE 'Added arrival_time to appointments';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'completion_time'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN completion_time TIMESTAMPTZ;
        RAISE NOTICE 'Added completion_time to appointments';
    END IF;
END $$;

-- 3. Re-apply Safe Trigger Function for Leads
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lead_id IS NOT NULL THEN
        BEGIN
            UPDATE public.leads
            SET last_activity_at = COALESCE(NEW.activity_date, NOW())
            WHERE id = NEW.lead_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erro ao atualizar last_activity_at para lead %: %', NEW.lead_id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

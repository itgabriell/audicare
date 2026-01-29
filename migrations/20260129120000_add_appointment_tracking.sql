-- Migration: Adicionar rastreamento de tempo de agendamento
-- Adiciona colunas para registrar chegada e conclusão

DO $$ 
BEGIN
    -- Data/Hora de chegada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'arrival_time'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN arrival_time TIMESTAMPTZ;
    END IF;

    -- Data/Hora de conclusão (saída)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'completion_time'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN completion_time TIMESTAMPTZ;
    END IF;

END $$;

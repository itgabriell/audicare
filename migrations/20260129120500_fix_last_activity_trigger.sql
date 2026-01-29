-- Migration: Safe Update for Lead Last Activity
-- Substitui a função trigger para evitar erros com last_activity_at

CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se temos um lead_id válido e uma data
    IF NEW.lead_id IS NOT NULL THEN
        -- Tenta atualizar, ignorando erros se lead não existir
        BEGIN
            UPDATE public.leads
            SET last_activity_at = COALESCE(NEW.activity_date, NOW())
            WHERE id = NEW.lead_id;
        EXCEPTION WHEN OTHERS THEN
            -- Log erro silencioso ou apenas ignorar para não travar a transação principal
            RAISE WARNING 'Erro ao atualizar last_activity_at para lead %: %', NEW.lead_id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

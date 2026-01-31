-- Migration: Enable Audit Logs
-- Date: 2026-01-30
-- Description: Creates a generic audit logging system and applies it to critical tables.

-- 1. Create the Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id uuid,
    operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values jsonb,
    new_values jsonb,
    changed_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- Index for fast lookup by record or table
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        changed_by
    )
    VALUES (
        TG_TABLE_NAME,
        CASE
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        TG_OP,
        CASE
            WHEN TG_OP = 'INSERT' THEN NULL
            ELSE to_jsonb(OLD)
        END,
        CASE
            WHEN TG_OP = 'DELETE' THEN NULL
            ELSE to_jsonb(NEW)
        END,
        auth.uid()
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply Trigger to Critical Tables

-- Patients (Prontuário)
DROP TRIGGER IF EXISTS audit_patients_trigger ON public.patients;
CREATE TRIGGER audit_patients_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- Invoices (Fiscal)
DROP TRIGGER IF EXISTS audit_invoices_trigger ON public.invoices;
CREATE TRIGGER audit_invoices_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- Consultations (Prontuário/Médico)
DROP TRIGGER IF EXISTS audit_consultations_trigger ON public.clinical_consultations;
CREATE TRIGGER audit_consultations_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clinical_consultations
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- Settings (Configurações Gerais)
DROP TRIGGER IF EXISTS audit_settings_trigger ON public.clinic_settings;
CREATE TRIGGER audit_settings_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clinic_settings
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- Automations (Risco de Spam)
DROP TRIGGER IF EXISTS audit_automations_trigger ON public.automations;
CREATE TRIGGER audit_automations_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.automations
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

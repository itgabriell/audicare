-- Description: Creates the automations system tables for WhatsApp messaging automation
-- Date: 2026-01-15

-- Create automations table
CREATE TABLE IF NOT EXISTS public.automations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'event')),
    trigger_config JSONB DEFAULT '{}', -- Configuration for triggers (schedule, event type, etc.)
    action_type TEXT NOT NULL CHECK (action_type IN ('whatsapp_message', 'email', 'sms')),
    action_config JSONB NOT NULL DEFAULT '{}', -- Message template, recipients, etc.
    filter_config JSONB DEFAULT '{}', -- Filters for target audience (patients who bought, birthdays, etc.)
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automation_executions table for tracking execution history
CREATE TABLE IF NOT EXISTS public.automation_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
    executed_by UUID REFERENCES auth.users(id),
    execution_type TEXT NOT NULL CHECK (execution_type IN ('manual', 'automatic')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    target_count INTEGER DEFAULT 0, -- Number of targets (contacts/patients)
    success_count INTEGER DEFAULT 0, -- Number of successful sends
    failure_count INTEGER DEFAULT 0, -- Number of failed sends
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create automation_execution_logs table for detailed logging
CREATE TABLE IF NOT EXISTS public.automation_execution_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES public.automation_executions(id) ON DELETE CASCADE,
    target_phone TEXT,
    target_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed')),
    message_id TEXT, -- WhatsApp message ID from UAZAPI
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_automations_clinic_id ON public.automations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_automations_status ON public.automations(status);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON public.automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_executions_automation_id ON public.automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON public.automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_execution_id ON public.automation_execution_logs(execution_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automations
CREATE POLICY "Users can view automations from their clinic" ON public.automations
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert automations for their clinic" ON public.automations
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update automations from their clinic" ON public.automations
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete automations from their clinic" ON public.automations
    FOR DELETE USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for automation_executions
CREATE POLICY "Users can view executions from their clinic automations" ON public.automation_executions
    FOR SELECT USING (
        automation_id IN (
            SELECT id FROM public.automations WHERE clinic_id IN (
                SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert executions for their clinic automations" ON public.automation_executions
    FOR INSERT WITH CHECK (
        automation_id IN (
            SELECT id FROM public.automations WHERE clinic_id IN (
                SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- RLS Policies for automation_execution_logs
CREATE POLICY "Users can view execution logs from their clinic automations" ON public.automation_execution_logs
    FOR SELECT USING (
        execution_id IN (
            SELECT id FROM public.automation_executions WHERE automation_id IN (
                SELECT id FROM public.automations WHERE clinic_id IN (
                    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
                )
            )
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_automations_updated_at_trigger
    BEFORE UPDATE ON public.automations
    FOR EACH ROW
    EXECUTE FUNCTION update_automations_updated_at();

-- Function to automatically create execution log when execution is completed
CREATE OR REPLACE FUNCTION log_automation_execution_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for execution completion
CREATE TRIGGER log_automation_execution_completion_trigger
    BEFORE UPDATE ON public.automation_executions
    FOR EACH ROW
    EXECUTE FUNCTION log_automation_execution_completion();

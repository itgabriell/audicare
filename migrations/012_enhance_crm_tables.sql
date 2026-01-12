-- Migration: Melhorias no CRM
-- Adiciona funcionalidades modernas de CRM

-- 0. Criar tabela leads se não existir
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source TEXT, -- origem do lead
    channel TEXT, -- canal de origem (whatsapp, instagram, etc)
    status TEXT NOT NULL DEFAULT 'new', -- new, contact, likely_purchase, purchased, no_purchase
    owner_id UUID REFERENCES public.profiles(id), -- responsável pelo lead
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_clinic_id ON public.leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage leads from their own clinics" ON public.leads;
CREATE POLICY "Members can manage leads from their own clinics"
ON public.leads FOR ALL
USING (is_member_of_clinic(clinic_id));

COMMENT ON TABLE public.leads IS 'Leads e oportunidades do CRM';

-- 1. Adicionar colunas à tabela leads se não existirem
DO $$ 
BEGIN
    -- Valor estimado da oportunidade
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'estimated_value'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN estimated_value DECIMAL(10,2);
    END IF;

    -- Data de próxima ação
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'next_action_date'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN next_action_date TIMESTAMPTZ;
    END IF;

    -- Tipo de próxima ação
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'next_action_type'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN next_action_type TEXT;
    END IF;

    -- Probabilidade de fechamento (0-100)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'probability'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100);
    END IF;

    -- Data de última atividade
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Tags (JSON array)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Score do lead (pontuação)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lead_score'
    ) THEN
        ALTER TABLE public.leads ADD COLUMN lead_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Criar tabela de atividades do CRM
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    activity_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'note', 'task', 'status_change'
    title TEXT NOT NULL,
    description TEXT,
    activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb, -- Para armazenar dados extras (duração, participantes, etc)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_clinic_id ON public.lead_activities(clinic_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_activity_date ON public.lead_activities(activity_date DESC);

COMMENT ON TABLE public.lead_activities IS 'Registra todas as atividades e interações com leads do CRM';
COMMENT ON COLUMN public.lead_activities.activity_type IS 'Tipo de atividade: call, email, meeting, note, task, status_change';
COMMENT ON COLUMN public.lead_activities.metadata IS 'Dados extras da atividade (duração de chamada, participantes, etc)';

-- 3. Criar tabela de notas do CRM
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_clinic_id ON public.lead_notes(clinic_id);

COMMENT ON TABLE public.lead_notes IS 'Notas e anotações sobre leads';

-- 4. Criar tabela de anexos do CRM
CREATE TABLE IF NOT EXISTS public.lead_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER, -- em bytes
    file_type TEXT, -- mime type
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead_id ON public.lead_attachments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_attachments_clinic_id ON public.lead_attachments(clinic_id);

COMMENT ON TABLE public.lead_attachments IS 'Anexos e documentos relacionados a leads';

-- 5. RLS para as novas tabelas
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage lead activities from their own clinics" ON public.lead_activities;
CREATE POLICY "Members can manage lead activities from their own clinics"
ON public.lead_activities FOR ALL
USING (is_member_of_clinic(clinic_id));

DROP POLICY IF EXISTS "Members can manage lead notes from their own clinics" ON public.lead_notes;
CREATE POLICY "Members can manage lead notes from their own clinics"
ON public.lead_notes FOR ALL
USING (is_member_of_clinic(clinic_id));

DROP POLICY IF EXISTS "Members can manage lead attachments from their own clinics" ON public.lead_attachments;
CREATE POLICY "Members can manage lead attachments from their own clinics"
ON public.lead_attachments FOR ALL
USING (is_member_of_clinic(clinic_id));

-- 6. Trigger para atualizar last_activity_at quando houver nova atividade
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.leads
    SET last_activity_at = NEW.activity_date
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lead_last_activity ON public.lead_activities;
CREATE TRIGGER trigger_update_lead_last_activity
AFTER INSERT ON public.lead_activities
FOR EACH ROW
EXECUTE FUNCTION update_lead_last_activity();


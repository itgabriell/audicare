-- =====================================================
-- Criação da Tabela clinical_consultations
-- =====================================================
-- Esta tabela armazena os dados das consultas clínicas
-- e é referenciada pela tabela de documentos.

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS public.clinical_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'finalized'
    
    -- Sinais Vitais
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    temperature DECIMAL(4,2),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    
    -- Dados da Consulta
    complaint TEXT,
    notes TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    
    -- Timestamps
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.clinical_consultations IS 'Armazena os dados das consultas clínicas realizadas';
COMMENT ON COLUMN public.clinical_consultations.status IS 'Status da consulta: draft (rascunho) ou finalized (finalizada)';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_clinical_consultations_patient_id ON public.clinical_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_consultations_clinic_id ON public.clinical_consultations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinical_consultations_professional_id ON public.clinical_consultations(professional_id);
CREATE INDEX IF NOT EXISTS idx_clinical_consultations_created_at ON public.clinical_consultations(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_clinical_consultations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clinical_consultations_updated_at ON public.clinical_consultations;
CREATE TRIGGER update_clinical_consultations_updated_at
    BEFORE UPDATE ON public.clinical_consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_clinical_consultations_updated_at();

-- RLS Policies
ALTER TABLE public.clinical_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consultations from their clinic"
    ON public.clinical_consultations FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create consultations in their clinic"
    ON public.clinical_consultations FOR INSERT
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
        AND professional_id = auth.uid()
    );

CREATE POLICY "Users can update consultations in their clinic"
    ON public.clinical_consultations FOR UPDATE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete consultations in their clinic"
    ON public.clinical_consultations FOR DELETE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );


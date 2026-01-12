-- =====================================================
-- Sistema de Múltiplos Telefones para Pacientes
-- =====================================================
-- Permite que pacientes tenham múltiplos números de telefone
-- Útil para casos onde o contato é com parente, filho, amigo, etc.

-- 1. Criar tabela de telefones de pacientes
CREATE TABLE IF NOT EXISTS public.patient_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    phone_type TEXT DEFAULT 'mobile', -- 'mobile', 'home', 'work', 'other', 'relative', 'friend'
    contact_name TEXT, -- Nome da pessoa se não for o próprio paciente (ex: "Filho - João")
    is_primary BOOLEAN DEFAULT false, -- Telefone principal
    is_whatsapp BOOLEAN DEFAULT true, -- Se tem WhatsApp
    notes TEXT, -- Observações sobre o telefone
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(patient_id, phone) -- Evita telefones duplicados para o mesmo paciente
);

COMMENT ON TABLE public.patient_phones IS 'Armazena múltiplos números de telefone para cada paciente';
COMMENT ON COLUMN public.patient_phones.phone_type IS 'Tipo: mobile, home, work, other, relative, friend';
COMMENT ON COLUMN public.patient_phones.contact_name IS 'Nome do contato se não for o próprio paciente (ex: "Filho - Maria")';
COMMENT ON COLUMN public.patient_phones.is_primary IS 'Indica se é o telefone principal do paciente';

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_patient_phones_patient_id ON public.patient_phones(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_phones_phone ON public.patient_phones(phone);
CREATE INDEX IF NOT EXISTS idx_patient_phones_primary ON public.patient_phones(patient_id, is_primary) WHERE is_primary = true;

-- 3. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_patient_phones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patient_phones_updated_at
    BEFORE UPDATE ON public.patient_phones
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_phones_updated_at();

-- 4. Função para garantir que sempre haja um telefone principal
CREATE OR REPLACE FUNCTION ensure_primary_phone()
RETURNS TRIGGER AS $$
BEGIN
    -- Se este telefone está sendo marcado como principal, desmarcar outros
    IF NEW.is_primary = true THEN
        UPDATE public.patient_phones
        SET is_primary = false
        WHERE patient_id = NEW.patient_id
        AND id != NEW.id
        AND is_primary = true;
    END IF;
    
    -- Se não há telefone principal, marcar este como principal
    IF NOT EXISTS (
        SELECT 1 FROM public.patient_phones
        WHERE patient_id = NEW.patient_id
        AND is_primary = true
    ) THEN
        NEW.is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_primary_phone_trigger
    BEFORE INSERT OR UPDATE ON public.patient_phones
    FOR EACH ROW
    EXECUTE FUNCTION ensure_primary_phone();

-- 5. Migrar telefones existentes da tabela patients
-- Copia o telefone da tabela patients para patient_phones se existir
DO $$
DECLARE
    patient_record RECORD;
BEGIN
    FOR patient_record IN 
        SELECT id, phone 
        FROM public.patients 
        WHERE phone IS NOT NULL 
        AND phone != ''
        AND NOT EXISTS (
            SELECT 1 FROM public.patient_phones 
            WHERE patient_id = patients.id
        )
    LOOP
        INSERT INTO public.patient_phones (patient_id, phone, is_primary, phone_type)
        VALUES (patient_record.id, patient_record.phone, true, 'mobile')
        ON CONFLICT (patient_id, phone) DO NOTHING;
    END LOOP;
END $$;

-- 6. RLS Policies
ALTER TABLE public.patient_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view phones from their clinic patients"
    ON public.patient_phones FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM public.patients
            WHERE clinic_id IN (
                SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create phones for their clinic patients"
    ON public.patient_phones FOR INSERT
    WITH CHECK (
        patient_id IN (
            SELECT id FROM public.patients
            WHERE clinic_id IN (
                SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update phones for their clinic patients"
    ON public.patient_phones FOR UPDATE
    USING (
        patient_id IN (
            SELECT id FROM public.patients
            WHERE clinic_id IN (
                SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete phones for their clinic patients"
    ON public.patient_phones FOR DELETE
    USING (
        patient_id IN (
            SELECT id FROM public.patients
            WHERE clinic_id IN (
                SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- 7. View para facilitar consultas (opcional)
CREATE OR REPLACE VIEW public.patients_with_phones AS
SELECT 
    p.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', pp.id,
                'phone', pp.phone,
                'phone_type', pp.phone_type,
                'contact_name', pp.contact_name,
                'is_primary', pp.is_primary,
                'is_whatsapp', pp.is_whatsapp,
                'notes', pp.notes
            ) ORDER BY pp.is_primary DESC, pp.created_at ASC
        ) FILTER (WHERE pp.id IS NOT NULL),
        '[]'::json
    ) as phones
FROM public.patients p
LEFT JOIN public.patient_phones pp ON p.id = pp.patient_id
GROUP BY p.id;

COMMENT ON VIEW public.patients_with_phones IS 'View que retorna pacientes com seus telefones agregados em JSON';


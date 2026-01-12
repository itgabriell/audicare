-- =====================================================
-- Sistema de Gestão de Documentos
-- =====================================================
-- Este script cria as tabelas necessárias para o sistema
-- de gestão de documentos médicos com templates, geração
-- de PDFs, armazenamento e envio automático.

-- 1. Tabela de Templates de Documentos
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'prescription', 'medical_certificate', 'report', 'invoice', etc.
    description TEXT,
    template_content JSONB NOT NULL, -- Estrutura do template com campos e layout
    watermark_enabled BOOLEAN DEFAULT true,
    watermark_text TEXT DEFAULT 'DOCUMENTO MÉDICO',
    signature_enabled BOOLEAN DEFAULT true,
    signature_position TEXT DEFAULT 'bottom-right', -- 'bottom-left', 'bottom-right', 'bottom-center'
    header_content JSONB, -- Logo, nome da clínica, etc.
    footer_content JSONB, -- Rodapé padrão
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clinic_id, name)
);

COMMENT ON TABLE public.document_templates IS 'Templates de documentos médicos que podem ser gerados durante consultas';
COMMENT ON COLUMN public.document_templates.template_content IS 'Estrutura JSON com campos do template, placeholders e layout';
COMMENT ON COLUMN public.document_templates.type IS 'Tipo do documento: prescription, medical_certificate, report, invoice, etc.';

-- 2. Tabela de Documentos Emitidos
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
    consultation_id UUID, -- Referência opcional a clinical_consultations (será adicionada após criar a tabela)
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL, -- Dados preenchidos do documento
    pdf_url TEXT, -- URL do PDF gerado no storage
    pdf_storage_path TEXT, -- Caminho no Supabase Storage
    metadata JSONB, -- Informações adicionais (número, série, etc.)
    issued_by UUID NOT NULL REFERENCES auth.users(id),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_via_whatsapp BOOLEAN DEFAULT false,
    sent_via_email BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.documents IS 'Documentos médicos emitidos para pacientes';
COMMENT ON COLUMN public.documents.content IS 'Dados preenchidos do documento em formato JSON';
COMMENT ON COLUMN public.documents.pdf_storage_path IS 'Caminho do arquivo PDF no Supabase Storage (bucket: documents)';
COMMENT ON COLUMN public.documents.metadata IS 'Metadados adicionais como número do documento, série, etc.';

-- 3. Tabela de Mensagens Padrão por Tipo de Documento
CREATE TABLE IF NOT EXISTS public.document_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    whatsapp_message TEXT NOT NULL,
    email_subject TEXT NOT NULL,
    email_body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clinic_id, document_type)
);

COMMENT ON TABLE public.document_messages IS 'Mensagens padrão para envio de documentos via WhatsApp e Email';
COMMENT ON COLUMN public.document_messages.document_type IS 'Tipo do documento que usa esta mensagem (prescription, medical_certificate, etc.)';

-- 4. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_clinic_id ON public.documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON public.documents(template_id);
CREATE INDEX IF NOT EXISTS idx_documents_consultation_id ON public.documents(consultation_id);
CREATE INDEX IF NOT EXISTS idx_documents_issued_at ON public.documents(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_clinic_id ON public.document_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON public.document_templates(type);
CREATE INDEX IF NOT EXISTS idx_document_messages_clinic_type ON public.document_messages(clinic_id, document_type);

-- 5. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON public.document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_document_templates_updated_at();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_templates_updated_at();

CREATE TRIGGER update_document_messages_updated_at
    BEFORE UPDATE ON public.document_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_document_templates_updated_at();

-- 6. RLS Policies
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_messages ENABLE ROW LEVEL SECURITY;

-- Policies para document_templates
CREATE POLICY "Users can view templates from their clinic"
    ON public.document_templates FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create templates in their clinic"
    ON public.document_templates FOR INSERT
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update templates in their clinic"
    ON public.document_templates FOR UPDATE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete templates in their clinic"
    ON public.document_templates FOR DELETE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Policies para documents
CREATE POLICY "Users can view documents from their clinic"
    ON public.documents FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create documents in their clinic"
    ON public.documents FOR INSERT
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
        AND issued_by = auth.uid()
    );

CREATE POLICY "Users can update documents in their clinic"
    ON public.documents FOR UPDATE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Policies para document_messages
CREATE POLICY "Users can view messages from their clinic"
    ON public.document_messages FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage messages in their clinic"
    ON public.document_messages FOR ALL
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 7. Criar bucket de storage para documentos (se não existir)
-- Nota: Isso precisa ser executado manualmente no Supabase Dashboard ou via API
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('documents', 'documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- 8. Política de storage para documentos (usuários autenticados podem fazer upload)
-- CREATE POLICY "Authenticated users can upload documents"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--     bucket_id = 'documents' AND
--     auth.role() = 'authenticated'
-- );

-- CREATE POLICY "Users can view documents from their clinic"
-- ON storage.objects FOR SELECT
-- USING (
--     bucket_id = 'documents' AND
--     auth.role() = 'authenticated'
-- );

-- CREATE POLICY "Users can delete their own documents"
-- ON storage.objects FOR DELETE
-- USING (
--     bucket_id = 'documents' AND
--     auth.role() = 'authenticated'
-- );


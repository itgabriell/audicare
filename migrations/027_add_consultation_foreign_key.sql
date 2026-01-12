-- =====================================================
-- Adicionar Foreign Key para clinical_consultations
-- =====================================================
-- Execute esta migração APÓS criar a tabela clinical_consultations
-- (migração 026_create_clinical_consultations.sql)

-- Adicionar constraint de foreign key se a tabela clinical_consultations existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clinical_consultations'
    ) THEN
        -- Remover constraint antiga se existir
        ALTER TABLE public.documents 
        DROP CONSTRAINT IF EXISTS documents_consultation_id_fkey;
        
        -- Adicionar nova constraint
        ALTER TABLE public.documents
        ADD CONSTRAINT documents_consultation_id_fkey
        FOREIGN KEY (consultation_id) 
        REFERENCES public.clinical_consultations(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela clinical_consultations não existe. Execute a migração 026 primeiro.';
    END IF;
END $$;


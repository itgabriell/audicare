-- Description: Add comprehensive patient fields for complete patient data import
-- Date: 2026-01-19

-- Add personal information fields
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Add fiscal/address fields for invoice generation
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS document TEXT, -- CPF/CNPJ formatted
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add medical fields
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS medical_history TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS medications TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_birthdate ON public.patients(birthdate) WHERE birthdate IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.patients.cpf IS 'CPF do paciente (apenas números)';
COMMENT ON COLUMN public.patients.email IS 'E-mail principal do paciente';
COMMENT ON COLUMN public.patients.birthdate IS 'Data de nascimento do paciente';
COMMENT ON COLUMN public.patients.gender IS 'Gênero do paciente (male, female, other)';
COMMENT ON COLUMN public.patients.document IS 'CPF/CNPJ formatado para emissão de notas fiscais';
COMMENT ON COLUMN public.patients.zip_code IS 'CEP do endereço';
COMMENT ON COLUMN public.patients.street IS 'Rua do endereço';
COMMENT ON COLUMN public.patients.number IS 'Número do endereço';
COMMENT ON COLUMN public.patients.complement IS 'Complemento do endereço';
COMMENT ON COLUMN public.patients.neighborhood IS 'Bairro do endereço';
COMMENT ON COLUMN public.patients.city IS 'Cidade do endereço';
COMMENT ON COLUMN public.patients.state IS 'Estado do endereço';
COMMENT ON COLUMN public.patients.medical_history IS 'Histórico médico do paciente';
COMMENT ON COLUMN public.patients.allergies IS 'Alergias conhecidas do paciente';
COMMENT ON COLUMN public.patients.medications IS 'Medicamentos em uso contínuo';

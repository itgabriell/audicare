-- Description: Creates the invoices system tables for fiscal document management
-- Date: 2026-01-15

-- Drop existing table if exists (to avoid conflicts)
DROP TABLE IF EXISTS public.invoices CASCADE;

-- Create invoices table (basic version first)
CREATE TABLE public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL,
    patient_id UUID,
    contact_id UUID,
    type TEXT NOT NULL CHECK (type IN ('fono', 'maintenance', 'sale')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    payment_method TEXT,
    installments INTEGER DEFAULT 1,
    model TEXT,
    quantity INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'processing',
    numero TEXT,
    serie TEXT DEFAULT '1',
    link TEXT,
    error_message TEXT,
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints separately
ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_clinic_id
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;

ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_patient_id
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_contact_id
    FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id ON public.invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON public.invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON public.invoices(issued_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices from their clinic" ON public.invoices
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert invoices for their clinic" ON public.invoices
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update invoices from their clinic" ON public.invoices
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Note: Triggers and functions will be added in a separate migration if needed
-- For now, let's focus on getting the basic table structure working

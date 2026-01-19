-- Description: Update existing tags system to support multi-clinic
-- Date: 2026-01-19

-- Update existing tags table to add clinic_id and other fields
ALTER TABLE public.tags
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remove the old unique constraint on name only
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_name_key;

-- Add new unique constraint on clinic_id + name
ALTER TABLE public.tags ADD CONSTRAINT IF NOT EXISTS tags_clinic_id_name_unique UNIQUE (clinic_id, name);

-- Add color format validation
ALTER TABLE public.tags ADD CONSTRAINT IF NOT EXISTS tags_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$' OR color IS NULL);

-- Update existing tags to have clinic_id (we'll use the default clinic for now)
-- This assumes there's only one clinic or we need to handle this manually
UPDATE public.tags SET clinic_id = (SELECT id FROM public.clinics LIMIT 1) WHERE clinic_id IS NULL;

-- Make clinic_id NOT NULL after populating existing records
ALTER TABLE public.tags ALTER COLUMN clinic_id SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tags_clinic_id ON public.tags(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tags_active ON public.tags(clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_patient_tags_patient_id ON public.patient_tags(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_tags_tag_id ON public.patient_tags(tag_id);

-- Add RLS policies for tags table
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Users can only see tags from their clinic
CREATE POLICY "Users can view tags from their clinic" ON public.tags
    FOR SELECT USING (clinic_id IN (
        SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Only clinic admins can manage tags
CREATE POLICY "Clinic admins can manage tags" ON public.tags
    FOR ALL USING (clinic_id IN (
        SELECT clinic_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'owner')
    ));

-- Add RLS policies for patient_tags table
ALTER TABLE public.patient_tags ENABLE ROW LEVEL SECURITY;

-- Users can only see patient tags from their clinic
CREATE POLICY "Users can view patient tags from their clinic" ON public.patient_tags
    FOR SELECT USING (patient_id IN (
        SELECT id FROM public.patients WHERE clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    ));

-- Users can manage patient tags from their clinic
CREATE POLICY "Users can manage patient tags from their clinic" ON public.patient_tags
    FOR ALL USING (patient_id IN (
        SELECT id FROM public.patients WHERE clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    ));

-- Add updated_at trigger for tags table
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tags_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.tags IS 'Available tags for categorizing patients';
COMMENT ON COLUMN public.tags.name IS 'Tag name (must be unique per clinic)';
COMMENT ON COLUMN public.tags.description IS 'Optional description of the tag purpose';
COMMENT ON COLUMN public.tags.color IS 'Hex color code for UI display';
COMMENT ON COLUMN public.tags.is_active IS 'Whether the tag is active and available for use';

COMMENT ON TABLE public.patient_tags IS 'Junction table linking patients to their tags';
COMMENT ON COLUMN public.patient_tags.patient_id IS 'Reference to the patient';
COMMENT ON COLUMN public.patient_tags.tag_id IS 'Reference to the tag';

-- Insert some default tags for the clinic
-- Note: This will be done via application interface, not hardcoded in migration

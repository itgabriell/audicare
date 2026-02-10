-- Add clinic_id column to repair_tickets table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repair_tickets' AND column_name = 'clinic_id') THEN
        ALTER TABLE repair_tickets ADD COLUMN clinic_id UUID REFERENCES clinics(id);
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_repair_tickets_clinic_id ON repair_tickets(clinic_id);

-- Optional: Add clinic_id to leads if missing (just in case, based on dashboard errors)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'clinic_id') THEN
        ALTER TABLE leads ADD COLUMN clinic_id UUID REFERENCES clinics(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_clinic_id ON leads(clinic_id);

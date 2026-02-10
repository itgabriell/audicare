-- Create campaign_rules table
CREATE TABLE IF NOT EXISTS campaign_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL, -- To support multiple clinics if needed, or just link to the main one
    trigger_text TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for performance if needed (though table will be small)
CREATE INDEX IF NOT EXISTS idx_campaign_rules_clinic_id ON campaign_rules(clinic_id);

-- Enable RLS
ALTER TABLE campaign_rules ENABLE ROW LEVEL SECURITY;

-- Policies (Adjust based on your auth model, assuming authenticated users can read/managed)
CREATE POLICY "Allow read access for authenticated users" ON campaign_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for authenticated users" ON campaign_rules
    FOR ALL TO authenticated USING (true);

-- Seed initial data (Using a placeholder clinic_id or assuming the app logic handles it)
-- We'll insert these via the frontend or a separate script to ensure correct clinic_id, 
-- BUT for this specific request, let's add them if we can determine the clinic_id.
-- Since I don't want to hardcode the clinic_id in the migration if it varies, 
-- I will just create the table structure here. The app or a manual query can seed it.

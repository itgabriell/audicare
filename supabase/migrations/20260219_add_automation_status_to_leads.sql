-- Add automation_status column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS automation_status TEXT DEFAULT 'active' CHECK (automation_status IN ('active', 'paused'));

-- Update existing records to default
UPDATE leads SET automation_status = 'active' WHERE automation_status IS NULL;

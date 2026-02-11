-- Migration to enhance repair_tickets table for new OS types

ALTER TABLE repair_tickets 
ADD COLUMN IF NOT EXISTS os_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS side TEXT, -- 'left', 'right', 'bilateral'
ADD COLUMN IF NOT EXISTS receiver TEXT,
ADD COLUMN IF NOT EXISTS dome TEXT,
ADD COLUMN IF NOT EXISTS mold_material TEXT, -- 'silicone', 'acrylic'
ADD COLUMN IF NOT EXISTS mold_type TEXT, -- 'shell', 'half_shell', 'canal', 'click', 'other'
ADD COLUMN IF NOT EXISTS vent TEXT, -- 'with', 'without'
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add constraints if needed, but text is flexible for now.
COMMENT ON COLUMN repair_tickets.os_type IS 'Type of repair: hearing_aid, earmold_aasi, earmold_plug, general';

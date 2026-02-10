-- 1. Deduplication Logic
-- Keep the lead with the most recent activity (last_message_at or created_at)
-- Delete others.

WITH duplicates AS (
    SELECT 
        id,
        phone,
        clinic_id,
        ROW_NUMBER() OVER (
            PARTITION BY clinic_id, phone 
            ORDER BY 
                COALESCE(last_message_at, created_at) DESC, -- Keep most recent activity
                created_at DESC -- Tie breaker
        ) as rn
    FROM leads
    WHERE phone IS NOT NULL AND phone != ''
)
DELETE FROM leads
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Add Unique Constraint to prevent future duplicates
-- Using an index allows us to add the constraint efficiently
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_clinic_phone 
ON leads(clinic_id, phone);

-- Add the actual constraint using the index
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_clinic_id_phone_key;

ALTER TABLE leads 
ADD CONSTRAINT leads_clinic_id_phone_key 
UNIQUE USING INDEX idx_leads_clinic_phone;

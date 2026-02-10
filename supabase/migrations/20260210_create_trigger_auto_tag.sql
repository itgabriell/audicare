-- Function to auto-tag leads based on campaign rules
CREATE OR REPLACE FUNCTION auto_tag_lead_campaign()
RETURNS TRIGGER AS $$
DECLARE
    rule RECORD;
    current_tags jsonb;
    new_tags text[];
    trigger_lower text;
    content_lower text;
BEGIN
    -- Initialize current_tags from NEW record
    current_tags := COALESCE(NEW.tags, '[]'::jsonb);
    
    -- Convert jsonb array to text array
    SELECT ARRAY(SELECT jsonb_array_elements_text(current_tags)) INTO new_tags;

    -- Get content to check (last_message_content)
    content_lower := lower(COALESCE(NEW.last_message_content, ''));
    
    IF content_lower = '' THEN
        RETURN NEW;
    END IF;

    -- Iterate through active campaign rules for the clinic
    FOR rule IN 
        SELECT trigger_text, tag_name 
        FROM campaign_rules 
        WHERE clinic_id = NEW.clinic_id AND is_active = true
    LOOP
        trigger_lower := lower(rule.trigger_text);
        
        -- Check if content contains trigger text
        IF content_lower LIKE '%' || trigger_lower || '%' THEN
            -- Add tag if not present
            IF NOT (rule.tag_name = ANY(new_tags)) THEN
                new_tags := array_append(new_tags, rule.tag_name);
            END IF;
        END IF;
    END LOOP;

    -- Update tags
    NEW.tags := to_jsonb(new_tags);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger based on Insert or Update of content
DROP TRIGGER IF EXISTS trigger_auto_tag_lead_campaign ON leads;

CREATE TRIGGER trigger_auto_tag_lead_campaign
BEFORE INSERT OR UPDATE OF last_message_content ON leads
FOR EACH ROW
EXECUTE FUNCTION auto_tag_lead_campaign();

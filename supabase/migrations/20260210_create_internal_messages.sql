-- Create internal_messages table
CREATE TABLE IF NOT EXISTS internal_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see messages sent by them or sent to them (in their clinic)
CREATE POLICY "Users can view their own messages"
ON internal_messages FOR SELECT
USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
);

-- Policy: Users can insert messages where they are the sender
CREATE POLICY "Users can send messages"
ON internal_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
);

-- Policy: Users can update 'is_read' for messages received by them
CREATE POLICY "Users can mark messages as read"
ON internal_messages FOR UPDATE
USING (
    auth.uid() = receiver_id
)
WITH CHECK (
    auth.uid() = receiver_id
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender ON internal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_receiver ON internal_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_clinic ON internal_messages(clinic_id);

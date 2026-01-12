-- This script safely deletes test and seed data from the database.
-- It targets data specifically created by the seeding process.

-- Step 1: Delete appointments. Since appointments are linked to patients and not directly
-- to seedable 'contacts', and for a clean slate, we remove all of them.
-- In a real production environment, you might want a more targeted delete.
TRUNCATE public.appointments RESTART IDENTITY;

-- Step 2: Delete messages associated with seed conversations.
-- We identify seed conversations by joining with contacts that have seed names.
DELETE FROM public.messages
WHERE conversation_id IN (
    SELECT conv.id
    FROM public.conversations conv
    JOIN public.contacts ct ON conv.contact_id = ct.id
    WHERE ct.name LIKE '%(SEED)%' OR ct.name IN ('Maria Silva', 'João Santos', 'Ana Pereira')
);

-- Step 3: Delete the seed conversations themselves.
DELETE FROM public.conversations
WHERE contact_id IN (
    SELECT id
    FROM public.contacts
    WHERE name LIKE '%(SEED)%' OR name IN ('Maria Silva', 'João Santos', 'Ana Pereira')
);

-- Step 4: Delete the seed contacts.
DELETE FROM public.contacts
WHERE name LIKE '%(SEED)%' OR name IN ('Maria Silva', 'João Santos', 'Ana Pereira');

-- Log completion
\echo 'Test and seed data cleanup complete.'
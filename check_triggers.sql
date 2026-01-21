-- Verificar triggers na tabela patients
SELECT
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'patients'
ORDER BY trigger_name;

-- Verificar se existe algum trigger específico
SELECT * FROM pg_trigger WHERE tgrelid = 'patients'::regclass;

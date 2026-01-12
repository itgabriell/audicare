-- Script de Validação para Anti-Duplicação de Conversas

-- 1. Verificar se o índice único existe
SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'conversations'
    AND indexname = 'conversations_clinic_contact_unique_idx'
) AS unique_index_exists;

-- 2. Verificar se há conversas duplicadas (não deveria haver)
SELECT 
    clinic_id,
    contact_id,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY last_message_at DESC NULLS LAST, created_at DESC) as conversation_ids,
    array_agg(last_message_at ORDER BY last_message_at DESC NULLS LAST, created_at DESC) as last_message_dates
FROM public.conversations
GROUP BY clinic_id, contact_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 3. Contar total de conversas
SELECT COUNT(*) AS total_conversations FROM public.conversations;

-- 4. Contar conversas únicas por (clinic_id, contact_id)
SELECT COUNT(DISTINCT (clinic_id, contact_id)) AS unique_conversation_pairs
FROM public.conversations;

-- 5. Verificar se todas as mensagens têm conversas válidas
SELECT 
    COUNT(*) AS messages_with_invalid_conversations
FROM public.messages m
LEFT JOIN public.conversations c ON m.conversation_id = c.id
WHERE c.id IS NULL;

-- 6. Verificar estrutura do índice
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'conversations'
AND indexname = 'conversations_clinic_contact_unique_idx';

-- 7. Tentar inserir uma conversa duplicada (deve falhar se a constraint estiver funcionando)
DO $$
DECLARE
    test_clinic_id UUID := (SELECT id FROM public.clinics LIMIT 1);
    test_contact_id UUID := (SELECT id FROM public.contacts WHERE clinic_id = test_clinic_id LIMIT 1);
    existing_conv_id UUID;
    duplicate_conv_id UUID;
    insert_success BOOLEAN := FALSE;
BEGIN
    -- Se não houver clínica ou contato, criar para o teste
    IF test_clinic_id IS NULL THEN
        INSERT INTO public.clinics (name) VALUES ('Test Clinic for Duplication') RETURNING id INTO test_clinic_id;
    END IF;
    
    IF test_contact_id IS NULL THEN
        INSERT INTO public.contacts (clinic_id, phone, name) 
        VALUES (test_clinic_id, '5511999990000', 'Test Contact') 
        RETURNING id INTO test_contact_id;
    END IF;

    -- Buscar conversa existente ou criar uma
    SELECT id INTO existing_conv_id
    FROM public.conversations
    WHERE clinic_id = test_clinic_id AND contact_id = test_contact_id
    LIMIT 1;

    IF existing_conv_id IS NULL THEN
        INSERT INTO public.conversations (clinic_id, contact_id, status)
        VALUES (test_clinic_id, test_contact_id, 'open')
        RETURNING id INTO existing_conv_id;
        RAISE NOTICE 'Conversa de teste criada: %', existing_conv_id;
    END IF;

    RAISE NOTICE 'Testando duplicação com clinic_id: %, contact_id: %, conversation_id: %', 
        test_clinic_id, test_contact_id, existing_conv_id;

    -- Tentar inserir uma conversa duplicada
    BEGIN
        INSERT INTO public.conversations (clinic_id, contact_id, status)
        VALUES (test_clinic_id, test_contact_id, 'open')
        RETURNING id INTO duplicate_conv_id;
        
        RAISE EXCEPTION 'Teste de duplicação FALHOU: Inseriu conversa duplicada com ID %!', duplicate_conv_id;
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'Teste de duplicação SUCESSO: Inserção de conversa duplicada foi BLOQUEADA pela constraint única.';
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro inesperado durante teste: %', SQLERRM;
    END;

END $$;

-- 8. Resumo final
SELECT 
    'Validação de Anti-Duplicação de Conversas' AS titulo,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'conversations' 
            AND indexname = 'conversations_clinic_contact_unique_idx'
        ) THEN '✓ Índice único criado'
        ELSE '✗ Índice único NÃO encontrado'
    END AS status_indice,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM public.conversations
            GROUP BY clinic_id, contact_id
            HAVING COUNT(*) > 1
        ) THEN '✓ Nenhuma duplicata encontrada'
        ELSE '✗ Duplicatas encontradas'
    END AS status_duplicatas,
    (SELECT COUNT(*) FROM public.conversations) AS total_conversas,
    (SELECT COUNT(DISTINCT (clinic_id, contact_id)) FROM public.conversations) AS pares_unicos;


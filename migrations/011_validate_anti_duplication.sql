-- Script de Validação: Verificar se as alterações anti-duplicação foram aplicadas
-- Execute este script no Supabase SQL Editor para validar

-- 1. Verificar se a coluna wa_message_id existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'wa_message_id'
    ) THEN
        RAISE NOTICE '✅ Coluna wa_message_id existe na tabela messages';
    ELSE
        RAISE WARNING '❌ Coluna wa_message_id NÃO existe na tabela messages';
    END IF;
END $$;

-- 2. Verificar se o índice único foi criado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND indexname = 'messages_wa_message_id_unique'
    ) THEN
        RAISE NOTICE '✅ Índice único messages_wa_message_id_unique foi criado';
    ELSE
        RAISE WARNING '❌ Índice único messages_wa_message_id_unique NÃO foi criado';
    END IF;
END $$;

-- 3. Verificar se o índice de deduplicação por conteúdo foi criado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND indexname = 'messages_dedup_content_idx'
    ) THEN
        RAISE NOTICE '✅ Índice messages_dedup_content_idx foi criado';
    ELSE
        RAISE WARNING '❌ Índice messages_dedup_content_idx NÃO foi criado';
    END IF;
END $$;

-- 4. Verificar estrutura do índice único (deve ser UNIQUE e parcial)
SELECT 
    i.indexname,
    i.indexdef,
    CASE 
        WHEN i.indexdef LIKE '%UNIQUE%' THEN '✅ É UNIQUE'
        ELSE '⚠️ NÃO é UNIQUE'
    END as is_unique,
    CASE 
        WHEN i.indexdef LIKE '%WHERE%' THEN '✅ É parcial (permite NULL)'
        ELSE '⚠️ NÃO é parcial'
    END as is_partial
FROM pg_indexes i
WHERE i.schemaname = 'public' 
AND i.tablename = 'messages' 
AND i.indexname = 'messages_wa_message_id_unique';

-- 5. Testar constraint: Tentar inserir mensagem duplicada (deve falhar se wa_message_id for o mesmo)
-- NOTA: Este teste requer dados reais. Ajuste os valores conforme necessário.
DO $$
DECLARE
    test_wa_id TEXT := 'TEST_DUPLICATE_' || extract(epoch from now())::text;
    test_conv_id UUID;
    test_clinic_id UUID;
    test_contact_id UUID;
    insert_count INTEGER := 0;
BEGIN
    -- Buscar IDs de exemplo (primeira conversa disponível)
    SELECT conversation_id, clinic_id, contact_id 
    INTO test_conv_id, test_clinic_id, test_contact_id
    FROM messages 
    LIMIT 1;
    
    IF test_conv_id IS NULL THEN
        RAISE NOTICE '⚠️ Não há mensagens no banco para testar. Pulando teste de duplicação.';
        RETURN;
    END IF;
    
    -- Tentar inserir primeira mensagem
    BEGIN
        INSERT INTO messages (
            conversation_id, clinic_id, contact_id, 
            sender_type, content, status, wa_message_id
        ) VALUES (
            test_conv_id, test_clinic_id, test_contact_id,
            'contact', 'Mensagem de teste', 'delivered', test_wa_id
        );
        insert_count := insert_count + 1;
        RAISE NOTICE '✅ Primeira inserção com wa_message_id = % bem-sucedida', test_wa_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '❌ Erro na primeira inserção: %', SQLERRM;
    END;
    
    -- Tentar inserir mensagem duplicada (mesmo wa_message_id)
    BEGIN
        INSERT INTO messages (
            conversation_id, clinic_id, contact_id, 
            sender_type, content, status, wa_message_id
        ) VALUES (
            test_conv_id, test_clinic_id, test_contact_id,
            'contact', 'Mensagem duplicada', 'delivered', test_wa_id
        );
        RAISE WARNING '❌ FALHA: Mensagem duplicada foi inserida! A constraint não está funcionando.';
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE '✅ SUCESSO: Constraint funcionou! Mensagem duplicada foi bloqueada.';
        WHEN OTHERS THEN
            RAISE WARNING '⚠️ Erro inesperado ao tentar inserir duplicata: %', SQLERRM;
    END;
    
    -- Limpar mensagens de teste
    DELETE FROM messages WHERE wa_message_id = test_wa_id;
    RAISE NOTICE '🧹 Mensagens de teste removidas';
END $$;

-- 6. Estatísticas da tabela messages
SELECT 
    COUNT(*) as total_mensagens,
    COUNT(DISTINCT wa_message_id) as mensagens_com_wa_id_unicas,
    COUNT(*) - COUNT(wa_message_id) as mensagens_sem_wa_id,
    COUNT(DISTINCT CASE WHEN wa_message_id IS NOT NULL THEN wa_message_id END) as wa_ids_unicos
FROM messages;

-- 7. Verificar se há duplicatas por wa_message_id (não deveria haver após a constraint)
SELECT 
    wa_message_id,
    COUNT(*) as quantidade
FROM messages
WHERE wa_message_id IS NOT NULL
GROUP BY wa_message_id
HAVING COUNT(*) > 1
ORDER BY quantidade DESC
LIMIT 10;

-- Se retornar linhas, há duplicatas que precisam ser limpas manualmente
-- Se não retornar nada, está tudo correto!

-- 8. Resumo final
SELECT 
    'Validação Completa' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'wa_message_id'
        ) THEN '✅'
        ELSE '❌'
    END as coluna_wa_message_id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'messages' 
            AND indexname = 'messages_wa_message_id_unique'
        ) THEN '✅'
        ELSE '❌'
    END as indice_unico,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'messages' 
            AND indexname = 'messages_dedup_content_idx'
        ) THEN '✅'
        ELSE '❌'
    END as indice_dedup;


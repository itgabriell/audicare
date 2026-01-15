-- Migration: Criar sistema completo de notificações
-- Implementa tabela de notificações com tipos automáticos e manuais

-- Criar tabela notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('manual', 'appointment', 'message', 'task', 'system', 'patient')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_push_sent BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    related_entity_type TEXT CHECK (related_entity_type IN ('patient', 'appointment', 'task', 'conversation', 'message')),
    related_entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_id ON public.notifications(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON public.notifications(related_entity_type, related_entity_id);
-- Índice composto para queries mais comuns (user + read status + date)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_date ON public.notifications(user_id, is_read, created_at DESC);
-- Índice para notificações não lidas por usuário
CREATE INDEX IF NOT EXISTS idx_notifications_unread_user ON public.notifications(user_id, created_at DESC) WHERE is_read = FALSE;

-- Políticas RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias notificações
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Política para admins verem todas as notificações da clínica
CREATE POLICY "Admins can view clinic notifications" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
            AND (profiles.clinic_id = notifications.clinic_id OR notifications.clinic_id IS NULL)
        )
    );

-- Política para inserir notificações (sistema e admins)
CREATE POLICY "System and admins can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Política para usuários atualizarem suas próprias notificações
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para admins atualizarem notificações
CREATE POLICY "Admins can update notifications" ON public.notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Política para deletar notificações (apenas admins)
CREATE POLICY "Admins can delete notifications" ON public.notifications
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Função para criar notificações automáticas
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_clinic_id UUID DEFAULT NULL,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        clinic_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        metadata
    ) VALUES (
        p_user_id,
        p_clinic_id,
        p_type,
        p_title,
        p_message,
        p_related_entity_type,
        p_related_entity_id,
        p_metadata
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para notificar sobre novos agendamentos
CREATE OR REPLACE FUNCTION notify_new_appointment()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar o profissional responsável
    IF NEW.professional_id IS NOT NULL THEN
        PERFORM create_notification(
            NEW.professional_id,
            NEW.clinic_id,
            'appointment',
            'Novo Agendamento',
            format('Novo agendamento com %s para %s',
                (SELECT name FROM patients WHERE id = NEW.patient_id),
                to_char(NEW.appointment_date, 'DD/MM/YYYY HH24:MI')
            ),
            'appointment',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para notificar sobre mensagens não lidas (otimizada)
CREATE OR REPLACE FUNCTION notify_unread_messages()
RETURNS TRIGGER AS $$
DECLARE
    clinic_users UUID[];
    contact_name TEXT;
BEGIN
    -- Buscar nome do contato uma vez
    SELECT name INTO contact_name
    FROM contacts
    WHERE id = NEW.contact_id;

    -- Buscar usuários da clínica em um array
    SELECT array_agg(p.id)
    INTO clinic_users
    FROM profiles p
    WHERE p.clinic_id = NEW.clinic_id
    AND p.role IN ('admin', 'super_admin', 'user');

    -- Criar notificação para cada usuário usando unnest
    INSERT INTO public.notifications (
        user_id,
        clinic_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        created_at,
        updated_at
    )
    SELECT
        unnest(clinic_users) as user_id,
        NEW.clinic_id,
        'message'::text,
        'Nova Mensagem'::text,
        format('Nova mensagem de %s', COALESCE(contact_name, 'Contato'))::text,
        'conversation'::text,
        NEW.conversation_id,
        NOW(),
        NOW()
    WHERE should_notify_user(unnest(clinic_users), 'message');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificações de agendamento
CREATE TRIGGER trigger_notify_new_appointment
    AFTER INSERT ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION notify_new_appointment();

-- Trigger para notificações de mensagens (apenas mensagens recebidas)
CREATE TRIGGER trigger_notify_unread_messages
    AFTER INSERT ON public.messages
    FOR EACH ROW
    WHEN (NEW.sender_type = 'contact')
    EXECUTE FUNCTION notify_unread_messages();

-- Criar tabela para configurações de notificações por usuário
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Políticas RLS para notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings" ON public.notification_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings" ON public.notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings" ON public.notification_settings
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Inserir configurações padrão para tipos de notificação
INSERT INTO public.notification_settings (user_id, notification_type, enabled)
SELECT
    p.id,
    unnest(ARRAY['appointment', 'message', 'task', 'system', 'patient']) as notification_type,
    TRUE as enabled
FROM profiles p
ON CONFLICT (user_id, notification_type) DO NOTHING;

-- Função para verificar se usuário deve receber notificação
CREATE OR REPLACE FUNCTION should_notify_user(p_user_id UUID, p_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.notification_settings
        WHERE user_id = p_user_id
        AND notification_type = p_type
        AND enabled = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Atualizar função de criar notificação para verificar configurações
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_clinic_id UUID DEFAULT NULL,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Verificar se usuário deve receber este tipo de notificação
    IF NOT should_notify_user(p_user_id, p_type) THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.notifications (
        user_id,
        clinic_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        metadata
    ) VALUES (
        p_user_id,
        p_clinic_id,
        p_type,
        p_title,
        p_message,
        p_related_entity_type,
        p_related_entity_id,
        p_metadata
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;

-- Função para limpeza automática de notificações antigas (90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deletar notificações lidas com mais de 90 dias
    DELETE FROM public.notifications
    WHERE is_read = TRUE
    AND created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log da operação (opcional)
    RAISE NOTICE 'Cleaned up % old notifications', deleted_count;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Criar job para limpeza automática (executar via pg_cron se disponível)
-- Para configurar: SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications();');

-- Adicionar comentários nas tabelas
COMMENT ON TABLE public.notifications IS 'Tabela central para sistema de notificações do Audicare';
COMMENT ON TABLE public.notification_settings IS 'Configurações de notificações por usuário';
COMMENT ON FUNCTION create_notification IS 'Função para criar notificações verificando preferências do usuário';
COMMENT ON FUNCTION should_notify_user IS 'Verifica se usuário deve receber determinado tipo de notificação';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Remove notificações lidas antigas (90+ dias) para otimizar performance';

-- Adiciona colunas de controle de lembretes na tabela de agendamentos

-- 1. reminder_sent_at: Data/hora do último envio
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- 2. reminder_count: Quantidade de lembretes enviados (padrão 0)
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- 3. auto_reminder_enabled: Controle individual (opcional, mas útil)
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS auto_reminder_enabled BOOLEAN DEFAULT TRUE;

-- Comentários para documentação
COMMENT ON COLUMN public.appointments.reminder_sent_at IS 'Data e hora do envio do último lembrete/confirmação';
COMMENT ON COLUMN public.appointments.reminder_count IS 'Número total de lembretes enviados para este agendamento';

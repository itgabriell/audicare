-- Migration: 002_create_rls_policies.sql
-- Description: Applies Row Level Security (RLS) policies to the multichannel and related tables.

-- Habilitar RLS e aplicar políticas para cada tabela.
-- A função `is_member_of_clinic(clinic_id)` é crucial e deve existir.
-- Ela verifica se o usuário autenticado (`auth.uid()`) pertence à clínica especificada.

-- 1. Tabela `patients`
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage patients from their own clinics" ON public.patients;
CREATE POLICY "Members can manage patients from their own clinics"
ON public.patients FOR ALL
USING (is_member_of_clinic(clinic_id));

-- 2. Tabela `contacts`
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage contacts from their own clinics" ON public.contacts;
CREATE POLICY "Members can manage contacts from their own clinics"
ON public.contacts FOR ALL
USING (is_member_of_clinic(clinic_id));

-- 3. Tabela `conversations`
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage conversations from their own clinics" ON public.conversations;
CREATE POLICY "Members can manage conversations from their own clinics"
ON public.conversations FOR ALL
USING (is_member_of_clinic(clinic_id));

-- 4. Tabela `messages`
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage messages from their own clinics" ON public.messages;
CREATE POLICY "Members can manage messages from their own clinics"
ON public.messages FOR ALL
USING (is_member_of_clinic(clinic_id));

-- 5. Tabela `appointments`
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage appointments from their own clinics" ON public.appointments;
CREATE POLICY "Members can manage appointments from their own clinics"
ON public.appointments FOR ALL
USING (is_member_of_clinic(clinic_id));

-- 6. Tabela `message_templates`
-- (Assumindo que `message_templates` também tem `clinic_id`, se não, a política precisa ser ajustada)
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage message templates from their own clinics" ON public.message_templates;
CREATE POLICY "Members can manage message templates from their own clinics"
ON public.message_templates FOR ALL
USING (is_member_of_clinic(clinic_id));

-- 7. Tabela `repairs`
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage repairs from their own clinics" ON public.repairs;
CREATE POLICY "Members can manage repairs from their own clinics"
ON public.repairs FOR ALL
USING (is_member_of_clinic(clinic_id));

-- 8. Tabela `tasks`
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage tasks from their own clinics" ON public.tasks;
CREATE POLICY "Members can manage tasks from their own clinics"
ON public.tasks FOR ALL
USING (is_member_of_clinic(clinic_id));
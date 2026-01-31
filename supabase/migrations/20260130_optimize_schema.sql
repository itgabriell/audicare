-- Migration: Optimize Database Schema
-- Date: 2026-01-30
-- Description: Adds missing indexes for Foreign Keys and fixes risky default values.

-- 1. FIX: Remove risky hardcoded default value for clinic_id in contacts
ALTER TABLE public.contacts ALTER COLUMN clinic_id DROP DEFAULT;

-- 2. OPTIMIZATION: Add Indexes for Foreign Keys to improve JOIN performance

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_by ON public.appointments(scheduled_by);

-- Automations
CREATE INDEX IF NOT EXISTS idx_automations_clinic_id ON public.automations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_automation_id ON public.automation_executions(automation_id);

-- Clinic Relations
CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic_id ON public.clinic_members(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_user_id ON public.clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_settings_clinic_id ON public.clinic_settings(clinic_id);

-- Consultations
CREATE INDEX IF NOT EXISTS idx_clinical_consultations_clinic_id ON public.clinical_consultations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinical_consultations_patient_id ON public.clinical_consultations(patient_id);

-- Contacts & Messages (High Traffic Table)
CREATE INDEX IF NOT EXISTS idx_contacts_clinic_id ON public.contacts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_contacts_patient_id ON public.contacts(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_clinic_id ON public.messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON public.messages(contact_id);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_clinic_id ON public.conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON public.conversations(contact_id);

-- CRM
CREATE INDEX IF NOT EXISTS idx_crm_deals_patient_id ON public.crm_deals(patient_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage_id ON public.crm_deals(stage_id);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_clinic_id ON public.documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents(patient_id);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id ON public.invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_clinic_id ON public.leads(clinic_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON public.profiles(clinic_id);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_clinic_id ON public.tasks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);

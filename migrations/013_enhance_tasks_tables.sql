-- Migration: Melhorias no Sistema de Tarefas
-- Adiciona funcionalidades modernas de gerenciamento de tarefas

-- 0. Criar tabela tasks se não existir
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo', -- todo, doing, done
    priority TEXT DEFAULT 'medium', -- low, medium, high
    assignee_id UUID REFERENCES public.profiles(id), -- responsável
    due_date DATE, -- prazo
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_clinic_id ON public.tasks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Habilitar RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage tasks from their own clinics" ON public.tasks;
CREATE POLICY "Members can manage tasks from their own clinics"
ON public.tasks FOR ALL
USING (is_member_of_clinic(clinic_id));

COMMENT ON TABLE public.tasks IS 'Tarefas internas da equipe';

-- 1. Adicionar colunas à tabela tasks se não existirem
DO $$ 
BEGIN
    -- Categoria/Tag da tarefa
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'category'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN category TEXT;
    END IF;

    -- Tags (JSON array)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Tempo estimado (em minutos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'estimated_time'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN estimated_time INTEGER; -- em minutos
    END IF;

    -- Tempo trabalhado (em minutos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'time_spent'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN time_spent INTEGER DEFAULT 0; -- em minutos
    END IF;

    -- Data de início
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN start_date DATE;
    END IF;

    -- Recurring (tarefa recorrente)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'is_recurring'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
    END IF;

    -- Frequência de recorrência
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'recurrence_pattern'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN recurrence_pattern TEXT; -- 'daily', 'weekly', 'monthly'
    END IF;
END $$;

-- 2. Criar tabela de checklists das tarefas
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON public.task_checklists(task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklists_clinic_id ON public.task_checklists(clinic_id);

COMMENT ON TABLE public.task_checklists IS 'Checklist de itens dentro de uma tarefa';

-- 3. Criar tabela de comentários das tarefas
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_clinic_id ON public.task_comments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at DESC);

COMMENT ON TABLE public.task_comments IS 'Comentários e discussões sobre tarefas';

-- 4. Criar tabela de anexos das tarefas
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER, -- em bytes
    file_type TEXT, -- mime type
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_clinic_id ON public.task_attachments(clinic_id);

COMMENT ON TABLE public.task_attachments IS 'Anexos e documentos relacionados a tarefas';

-- 5. Criar tabela de dependências entre tarefas
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT task_dependencies_no_self_reference CHECK (task_id != depends_on_task_id),
    CONSTRAINT task_dependencies_unique UNIQUE (task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_clinic_id ON public.task_dependencies(clinic_id);

COMMENT ON TABLE public.task_dependencies IS 'Define dependências entre tarefas (task_id depende de depends_on_task_id)';

-- 6. Criar tabela de tempo trabalhado (time tracking)
CREATE TABLE IF NOT EXISTS public.task_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER, -- calculado automaticamente
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_time_entries_task_id ON public.task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_user_id ON public.task_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_clinic_id ON public.task_time_entries(clinic_id);

COMMENT ON TABLE public.task_time_entries IS 'Registra tempo trabalhado em tarefas (time tracking)';

-- 7. RLS para as novas tabelas
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage task checklists from their own clinics" ON public.task_checklists;
CREATE POLICY "Members can manage task checklists from their own clinics"
ON public.task_checklists FOR ALL
USING (is_member_of_clinic(clinic_id));

DROP POLICY IF EXISTS "Members can manage task comments from their own clinics" ON public.task_comments;
CREATE POLICY "Members can manage task comments from their own clinics"
ON public.task_comments FOR ALL
USING (is_member_of_clinic(clinic_id));

DROP POLICY IF EXISTS "Members can manage task attachments from their own clinics" ON public.task_attachments;
CREATE POLICY "Members can manage task attachments from their own clinics"
ON public.task_attachments FOR ALL
USING (is_member_of_clinic(clinic_id));

DROP POLICY IF EXISTS "Members can manage task dependencies from their own clinics" ON public.task_dependencies;
CREATE POLICY "Members can manage task dependencies from their own clinics"
ON public.task_dependencies FOR ALL
USING (is_member_of_clinic(clinic_id));

DROP POLICY IF EXISTS "Members can manage task time entries from their own clinics" ON public.task_time_entries;
CREATE POLICY "Members can manage task time entries from their own clinics"
ON public.task_time_entries FOR ALL
USING (is_member_of_clinic(clinic_id));

-- 8. Função para atualizar time_spent automaticamente
CREATE OR REPLACE FUNCTION update_task_time_spent()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tasks
    SET time_spent = (
        SELECT COALESCE(SUM(duration_minutes), 0)
        FROM public.task_time_entries
        WHERE task_id = NEW.task_id AND ended_at IS NOT NULL
    )
    WHERE id = NEW.task_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_task_time_spent ON public.task_time_entries;
CREATE TRIGGER trigger_update_task_time_spent
AFTER INSERT OR UPDATE ON public.task_time_entries
FOR EACH ROW
WHEN (NEW.ended_at IS NOT NULL)
EXECUTE FUNCTION update_task_time_spent();


-- Schema: Gestão de Social Media - AudiCare
-- Este schema suporta campanhas de marketing e posts para redes sociais
-- Metodologia: Esteira de Produção (Kanban)

-- ======================================================================
-- Schema: Gestão de Social Media - AudiCare
-- Este schema adapta a tabela social_posts existente e cria marketing_campaigns
-- ======================================================================

-- 1. Tabela de Campanhas (O Tema do Mês)
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- Ex: "Natal em Família"
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active', -- active, paused, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adaptar tabela social_posts existente
-- Adiciona colunas que faltam, mantendo as existentes
DO $$
BEGIN
  -- Adicionar clinic_id se não existir
  -- NOTA: A coluna será nullable para permitir registros existentes sem clinic_id
  -- Você pode atualizar os registros existentes manualmente depois se necessário
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.social_posts ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;
    -- Se houver registros existentes, você pode atualizá-los depois com:
    -- UPDATE public.social_posts SET clinic_id = (SELECT id FROM public.clinics LIMIT 1) WHERE clinic_id IS NULL;
  END IF;

  -- Adicionar campaign_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE public.social_posts ADD COLUMN campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;
  END IF;

  -- Converter channel (text) para channels (array) se necessário
  -- Primeiro adiciona a nova coluna channels
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'channels'
  ) THEN
    ALTER TABLE public.social_posts ADD COLUMN channels TEXT[] DEFAULT ARRAY[]::TEXT[];
    
    -- Migra dados da coluna channel antiga para channels (array)
    UPDATE public.social_posts 
    SET channels = ARRAY[channel] 
    WHERE channel IS NOT NULL AND channels IS NULL;
  END IF;

  -- Adicionar media_type se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE public.social_posts ADD COLUMN media_type TEXT;
  END IF;

  -- Renomear scheduled_at para scheduled_date se necessário (ou adicionar scheduled_date)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'scheduled_date'
  ) THEN
    -- Se scheduled_at existe, renomeia; senão cria scheduled_date
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'scheduled_at'
    ) THEN
      ALTER TABLE public.social_posts RENAME COLUMN scheduled_at TO scheduled_date;
    ELSE
      ALTER TABLE public.social_posts ADD COLUMN scheduled_date TIMESTAMPTZ;
    END IF;
  END IF;

  -- Adicionar published_date se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'published_date'
  ) THEN
    ALTER TABLE public.social_posts ADD COLUMN published_date TIMESTAMPTZ;
  END IF;

  -- Adicionar assignee_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'assignee_id'
  ) THEN
    ALTER TABLE public.social_posts ADD COLUMN assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Adicionar media_urls se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'media_urls'
  ) THEN
    ALTER TABLE public.social_posts ADD COLUMN media_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  -- Atualizar status padrão se necessário (de 'planned' para 'idea')
  -- Não vamos alterar valores existentes, apenas garantir que o default está correto
  -- O status 'planned' será mapeado para 'scheduled' na aplicação se necessário

END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_clinic_id ON public.marketing_campaigns(clinic_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_clinic_id ON public.social_posts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_campaign_id ON public.social_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_date ON public.social_posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_social_posts_assignee_id ON public.social_posts(assignee_id);

-- RLS (Row Level Security)
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para marketing_campaigns
-- Verifica se o usuário autenticado pertence à mesma clínica do registro
DROP POLICY IF EXISTS "Members can manage marketing campaigns from their own clinics" ON public.marketing_campaigns;
CREATE POLICY "Members can manage marketing campaigns from their own clinics"
  ON public.marketing_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.clinic_id = marketing_campaigns.clinic_id
    )
  );

-- Políticas RLS para social_posts
-- Verifica se o usuário autenticado pertence à mesma clínica do registro
-- NOTA: Registros com clinic_id NULL serão acessíveis por todos (temporário até migração)
DROP POLICY IF EXISTS "Members can manage social posts from their own clinics" ON public.social_posts;
CREATE POLICY "Members can manage social posts from their own clinics"
  ON public.social_posts FOR ALL
  USING (
    social_posts.clinic_id IS NULL OR
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.clinic_id = social_posts.clinic_id
    )
  );

-- ALTERNATIVA: Se a abordagem acima não funcionar, descomente estas políticas:
-- DROP POLICY IF EXISTS "Members can manage marketing campaigns from their own clinics" ON public.marketing_campaigns;
-- CREATE POLICY "Members can manage marketing campaigns from their own clinics"
--   ON public.marketing_campaigns FOR ALL
--   USING (is_member_of_clinic(marketing_campaigns.clinic_id));
--
-- DROP POLICY IF EXISTS "Members can manage social posts from their own clinics" ON public.social_posts;
-- CREATE POLICY "Members can manage social posts from their own clinics"
--   ON public.social_posts FOR ALL
--   USING (is_member_of_clinic(social_posts.clinic_id));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketing_campaigns_updated_at 
  BEFORE UPDATE ON public.marketing_campaigns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at 
  BEFORE UPDATE ON public.social_posts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.marketing_campaigns IS 'Campanhas de marketing temáticas (ex: Natal, Dia das Mães)';
COMMENT ON TABLE public.social_posts IS 'Posts para redes sociais com esteira de produção (Kanban)';
COMMENT ON COLUMN public.social_posts.status IS 'Estados: idea, scripting, to_record, editing, ready, scheduled, published';
COMMENT ON COLUMN public.social_posts.channels IS 'Array de canais: instagram, whatsapp, facebook';


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Briefcase, ChevronDown, Search, TrendingUp, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LeadDialog from '@/components/crm/LeadDialog';
import KanbanBoard from '@/components/crm/KanbanBoard';
import { useToast } from '@/components/ui/use-toast';
import { getLeads, addLead, updateLead, getTeamMembers } from '@/database';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const CRM = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  // filtros
  const [stageFilter, setStageFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLeads();
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[CRM] Erro ao carregar leads', error);
      setLeads([]);
      toast({
        title: 'Erro ao carregar leads',
        description:
          error?.message ||
          'Ocorreu um erro ao buscar os leads. Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLeads();
    loadTeamMembers();
  }, [loadLeads]);

  const loadTeamMembers = useCallback(async () => {
    try {
      const members = await getTeamMembers();
      setTeamMembers(members || []);
    } catch (error) {
      // Erro não crítico - apenas loga se necessário
      if (error?.code !== 'PGRST116') { // PGRST116 = no rows returned, não é erro
        console.warn('[CRM] Aviso ao carregar membros da equipe:', error?.message || 'Erro desconhecido');
      }
      setTeamMembers([]);
    }
  }, []);

  const handleSaveLead = async (leadData) => {
    try {
      if (!user?.id) {
        throw new Error('Usuário não autenticado.');
      }

      const payload = {
        ...leadData,
        status: leadData.status || 'new',
      };

      if (editingLead) {
        const updatedLead = await updateLead(editingLead.id, payload);
        setLeads((prev) =>
          prev.map((lead) => (lead.id === editingLead.id ? updatedLead : lead))
        );
        toast({ title: 'Sucesso!', description: 'Lead atualizado com sucesso.' });
      } else {
        const addedLead = await addLead(payload, user.id);
        setLeads((prev) => [addedLead, ...prev]);
        toast({ title: 'Sucesso!', description: 'Novo lead adicionado.' });
      }
      
      setDialogOpen(false);
      setEditingLead(null);
    } catch (error) {
      console.error('[CRM] Erro ao salvar lead', error);
      toast({
        title: 'Erro ao salvar lead',
        description:
          error?.message ||
          'Não foi possível salvar o lead. Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateLead = async (leadId, newStatus) => {
    try {
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead,
        ),
      );

      await updateLead(leadId, { status: newStatus });
    } catch (error) {
      console.error('[CRM] Erro ao atualizar lead', error);
      toast({
        title: 'Erro ao mover lead',
        description:
          error?.message ||
          'Não foi possível mover o lead para a nova etapa. Atualize a página e tente novamente.',
        variant: 'destructive',
      });
      loadLeads();
    }
  };

  const handleOpenNewLead = () => {
    setEditingLead(null);
    setDialogOpen(true);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const handleOpenConversation = (lead) => {
    if (!lead.phone) {
      toast({
        title: 'Telefone não informado',
        description:
          'Cadastre um telefone para este lead para abrir a conversa.',
        variant: 'destructive',
      });
      return;
    }
    navigate(`/inbox?phone=${encodeURIComponent(lead.phone)}`);
  };

  const handleScheduleFromLead = (lead) => {
    navigate(`/appointments?leadId=${encodeURIComponent(lead.id)}`);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (stageFilter !== 'all' && lead.status !== stageFilter) return false;
      if (ownerFilter !== 'all' && lead.owner_id !== ownerFilter) return false;
      if (channelFilter !== 'all' && lead.channel !== channelFilter) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = lead.name?.toLowerCase().includes(searchLower);
        const matchesEmail = lead.email?.toLowerCase().includes(searchLower);
        const matchesPhone = lead.phone?.includes(searchTerm);
        const matchesSource = lead.source?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesSource) return false;
      }
      return true;
    });
  }, [leads, stageFilter, ownerFilter, channelFilter, searchTerm]);

  // Métricas
  const metrics = useMemo(() => {
    const totalValue = filteredLeads.reduce((sum, lead) => {
      const value = lead.estimated_value ? parseFloat(lead.estimated_value) : 0;
      const prob = lead.probability ? lead.probability / 100 : 0;
      return sum + (value * prob);
    }, 0);

    const avgProbability = filteredLeads.length > 0
      ? filteredLeads.reduce((sum, lead) => sum + (lead.probability || 0), 0) / filteredLeads.length
      : 0;

    return {
      total: filteredLeads.length,
      totalValue: totalValue,
      avgProbability: avgProbability,
      byStage: {
        new: filteredLeads.filter(l => l.status === 'new').length,
        contact: filteredLeads.filter(l => l.status === 'contact').length,
        likely_purchase: filteredLeads.filter(l => l.status === 'likely_purchase').length,
        purchased: filteredLeads.filter(l => l.status === 'purchased').length,
      }
    };
  }, [filteredLeads]);

  const stageOptions = {
    all: 'Todas as etapas',
    new: 'Novo',
    contact: 'Em contato',
    likely_purchase: 'Provável Compra',
    purchased: 'Comprou',
    no_purchase: 'Não Comprou'
  };

  const channelOptions = {
    all: 'Todos os canais',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    referral: 'Indicação',
    site: 'Site',
    other: 'Outro'
  };

  // Owner filter options
  const ownerOptions = useMemo(() => {
    const options = { all: 'Todos responsáveis' };
    teamMembers.forEach(member => {
      options[member.id] = member.full_name || member.email;
    });
    return options;
  }, [teamMembers]);


  return (
    <>
      <Helmet>
        <title>CRM - Audicare</title>
        <meta
          name="description"
          content="Gerenciamento de Relacionamento com o Cliente (CRM)"
        />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">CRM</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Gerencie o funil de vendas, leads e oportunidades
            </p>
          </div>
          <Button onClick={handleOpenNewLead}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Esperado</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalValue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Probabilidade Média</p>
                <p className="text-2xl font-bold text-foreground mt-1">{Math.round(metrics.avgProbability)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Convertidos</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metrics.byStage.purchased}</p>
              </div>
              <Briefcase className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="bg-card border rounded-lg p-3 flex flex-col gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone ou origem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* Stage Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-normal text-muted-foreground gap-1 px-2">
                  Etapa: <span className="text-foreground font-medium">{stageOptions[stageFilter]}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={stageFilter} onValueChange={setStageFilter}>
                  {Object.entries(stageOptions).map(([value, label]) => (
                    <DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Owner Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-normal text-muted-foreground gap-1 px-2">
                  Responsável: <span className="text-foreground font-medium">{ownerOptions[ownerFilter]}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={ownerFilter} onValueChange={setOwnerFilter}>
                  {Object.entries(ownerOptions).map(([value, label]) => (
                    <DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Channel Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-normal text-muted-foreground gap-1 px-2">
                  Canal: <span className="text-foreground font-medium">{channelOptions[channelFilter]}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={channelFilter} onValueChange={setChannelFilter}>
                  {Object.entries(channelOptions).map(([value, label]) => (
                    <DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredLeads.length > 0 ? (
          <KanbanBoard
            leads={filteredLeads}
            onUpdateLead={handleUpdateLead}
            onEditLead={handleEditLead}
            onOpenConversation={handleOpenConversation}
            onScheduleFromLead={handleScheduleFromLead}
          />
        ) : (
          <div className="text-center py-16 space-y-3 bg-card border rounded-lg">
            <Briefcase className="h-16 w-16 text-muted-foreground/30 mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">Nenhum lead encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Comece cadastrando seu primeiro lead ou ajuste os filtros para ver os resultados.
            </p>
            <Button className="mt-4" onClick={handleOpenNewLead}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar seu primeiro lead
            </Button>
          </div>
        )}

        {/* Dialog for creating/editing */}
        <LeadDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingLead(null);
          }}
          onSave={handleSaveLead}
          lead={editingLead}
        />
      </div>
    </>
  );
};

export default CRM;
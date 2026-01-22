import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Bot, Plus, Trash2, Send, Clock, Play, Edit, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/database.js';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AutomationForm from '@/components/automations/AutomationForm';

const Automations = () => {
    const [automations, setAutomations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAutomation, setEditingAutomation] = useState(null);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        loadAutomations();
    }, []);

    const loadAutomations = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('automations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAutomations(data || []);
        } catch (error) {
            console.error('Error loading automations:', error);
            toast({
                title: 'Erro ao carregar automações',
                description: 'Não foi possível carregar a lista de automações.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAutomation = () => {
        setEditingAutomation(null);
        setDialogOpen(true);
    };

    const handleEditAutomation = (automation) => {
        setEditingAutomation(automation);
        setDialogOpen(true);
    };

    const handleSaveAutomation = async (automationData) => {
        try {
            setSaving(true);

            // Get clinic_id from user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('clinic_id')
                .eq('id', user.id)
                .single();

            if (!profile?.clinic_id) {
                throw new Error('Usuário não está associado a uma clínica');
            }

            const dataToSave = {
                ...automationData,
                clinic_id: profile.clinic_id,
                created_by: user.id
            };

            let result;
            if (editingAutomation) {
                // Update existing automation
                result = await supabase
                    .from('automations')
                    .update(dataToSave)
                    .eq('id', editingAutomation.id)
                    .select()
                    .single();
            } else {
                // Create new automation
                result = await supabase
                    .from('automations')
                    .insert(dataToSave)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            toast({
                title: editingAutomation ? 'Automação atualizada' : 'Automação criada',
                description: `A automação "${result.data.name}" foi ${editingAutomation ? 'atualizada' : 'criada'} com sucesso.`,
            });

            setDialogOpen(false);
            setEditingAutomation(null);
            loadAutomations();

        } catch (error) {
            console.error('Error saving automation:', error);
            toast({
                title: 'Erro ao salvar automação',
                description: error.message || 'Ocorreu um erro ao salvar a automação.',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleExecuteAutomation = async (automation) => {
        try {
            toast({
                title: 'Executando automação...',
                description: `Iniciando execução da automação "${automation.name}".`,
            });

            // Usar rota do backend ao invés do AutomationService
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.audicarefono.com.br';
            const response = await fetch(`${apiUrl}/api/automations/${automation.id}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: '11999999999' }) // Número de teste
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'Teste executado',
                    description: `Mensagem de teste enviada com sucesso.`,
                });
            } else {
                throw new Error(result.error || 'Erro na execução');
            }

        } catch (error) {
            console.error('Error executing automation:', error);
            toast({
                title: 'Erro na execução',
                description: error.message || 'Não foi possível executar a automação.',
                variant: 'destructive'
            });
        }
    };

    const handleDeleteAutomation = async (automationId) => {
        if (!confirm('Tem certeza que deseja excluir esta automação?')) return;

        try {
            const { error } = await supabase
                .from('automations')
                .delete()
                .eq('id', automationId);

            if (error) throw error;

            toast({
                title: 'Automação removida',
                description: 'A automação foi removida com sucesso.',
            });

            loadAutomations();
        } catch (error) {
            console.error('Error deleting automation:', error);
            toast({
                title: 'Erro ao remover automação',
                description: 'Não foi possível remover a automação.',
                variant: 'destructive'
            });
        }
    };

    const getTriggerDisplay = (automation) => {
        switch (automation.trigger_type) {
            case 'manual':
                return 'Manual';
            case 'scheduled':
                // Mapear cron expressions para descrições legíveis
                const cronMap = {
                    '0 9 * * *': 'Todo dia às 9:00',
                    '0 8 * * *': 'Todo dia às 8:00',
                    '0 14 * * *': 'Todo dia às 14:00',
                    '0 18 * * *': 'Todo dia às 18:00'
                };
                return cronMap[automation.trigger_config?.schedule] || automation.trigger_config?.schedule || 'Agendado';
            case 'event':
                const eventTypes = {
                    'patient_created': 'Novo Paciente',
                    'appointment_created': 'Nova Consulta',
                    'appointment_completed': 'Consulta Finalizada',
                    'birthday': 'Aniversário',
                    'arrived': 'Paciente Chegou',
                    'completed': 'Consulta Finalizada',
                    'scheduled': 'Consulta Agendada'
                };
                return eventTypes[automation.trigger_config?.event_type || automation.trigger_config?.appointment_status] || 'Evento';
            default:
                return 'Desconhecido';
        }
    };

    const getActionDisplay = (automation) => {
        switch (automation.action_type) {
            case 'whatsapp_message':
                return 'WhatsApp';
            case 'email':
                return 'E-mail';
            case 'sms':
                return 'SMS';
            default:
                return 'Desconhecido';
        }
    };

    return (
        <>
            <Helmet>
                <title>Automações - Audicare</title>
                <meta name="description" content="Gerencie automações e fluxos de trabalho para otimizar processos." />
            </Helmet>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">🤖 Automações de Engajamento</h1>
                        <p className="text-muted-foreground mt-1">Configure mensagens automáticas para manter o contato com seus pacientes via Chatwoot.</p>
                    </div>
                    <Button onClick={handleCreateAutomation}>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Automação
                    </Button>
                </div>
                
                <Card>
                        <CardHeader>
                        <CardTitle>Fluxos de Trabalho Ativos</CardTitle>
                        <CardDescription>
                            Abaixo estão as automações configuradas. Cada automação pode ser executada manualmente ou disparada automaticamente por gatilhos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : automations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Nenhuma automação criada</p>
                                <p className="text-sm">Crie sua primeira automação para começar a enviar mensagens automaticamente.</p>
                            </div>
                        ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome da Automação</TableHead>
                                  <TableHead>Gatilho</TableHead>
                                  <TableHead>Ação</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {automations.map((automation) => (
                                  <TableRow key={automation.id}>
                                    <TableCell className="font-medium">{automation.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span>{getTriggerDisplay(automation)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Send className="h-4 w-4 text-green-500" />
                                            <span>{getActionDisplay(automation)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={automation.status === 'active' ? 'default' : 'outline'}>
                                            {automation.status === 'active' ? 'Ativa' : 'Pausada'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleExecuteAutomation(automation)}
                                        title="Executar automação"
                                      >
                                        <Play className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditAutomation(automation)}
                                        title="Editar automação"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteAutomation(automation.id)}
                                        title="Excluir automação"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Dialog para criar/editar automação */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingAutomation ? 'Editar Automação' : 'Criar Nova Automação'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingAutomation
                                    ? 'Edite as configurações da automação selecionada.'
                                    : 'Configure uma nova automação para envio automático de mensagens.'
                                }
                            </DialogDescription>
                        </DialogHeader>
                        <AutomationForm
                            automation={editingAutomation}
                            onSave={handleSaveAutomation}
                            onCancel={() => {
                                setDialogOpen(false);
                                setEditingAutomation(null);
                            }}
                            isLoading={saving}
                        />
                    </DialogContent>
                </Dialog>

            </div>
        </>
    );
};

export default Automations;

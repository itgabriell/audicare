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
    const [processingAutomationId, setProcessingAutomationId] = useState(null);
    const [runDialogOpen, setRunDialogOpen] = useState(false);
    const [selectedAutomation, setSelectedAutomation] = useState(null);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [executionResult, setExecutionResult] = useState(null);
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

    const handleRunAutomation = async (automation, mode) => {
        setProcessingAutomationId(automation.id);
        setRunDialogOpen(false);

        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.audicarefono.com.br';
            let endpoint = '';
            let body = {};

            if (mode === 'test') {
                endpoint = `/api/automations/${automation.id}/test`;
                body = { phone: '11999999999' };
                toast({ title: 'Iniciando Teste...', description: 'Enviando mensagem de teste.' });
            } else {
                endpoint = `/api/automations/${automation.id}/execute`;
                toast({ title: 'Iniciando Execução em Massa...', description: 'Isso pode levar alguns instantes.' });
            }

            const response = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': import.meta.env.VITE_INTERNAL_API_KEY
                },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                if (mode === 'execute') {
                    setExecutionResult(result);
                    setReportDialogOpen(true);
                } else {
                    toast({ title: 'Teste enviado!', description: 'Verifique seu WhatsApp.' });
                }
            } else {
                throw new Error(result.error || 'Erro na execução');
            }

        } catch (error) {
            console.error('Error executing automation:', error);
            toast({
                title: 'Erro',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setProcessingAutomationId(null);
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

            <div className="h-full flex flex-col space-y-4 pr-1 relative">
                {/* Floating Header */}
                <div className="flex flex-col gap-2 md:gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-3 md:p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans flex items-center gap-2">
                                <Bot className="h-6 w-6 text-primary" />
                                Automações
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Configure mensagens automáticas para seus pacientes
                            </p>
                        </div>
                        <Button
                            onClick={handleCreateAutomation}
                            className="rounded-xl h-11 px-5 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all w-full md:w-auto"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Automação
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto rounded-3xl pb-10">

                    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white/50 dark:bg-slate-900/50">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">Fluxos de Trabalho Ativos</CardTitle>
                            <CardDescription>
                                Abaixo estão as automações configuradas. Cada automação pode ser executada manualmente ou disparada automaticamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : automations.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-200">Nenhuma automação criada</p>
                                    <p className="text-sm text-slate-500 max-w-sm mx-auto">Crie sua primeira automação para começar a enviar mensagens automaticamente.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="pl-6 h-12 text-xs font-semibold uppercase tracking-wider text-slate-500">Nome da Automação</TableHead>
                                            <TableHead className="h-12 text-xs font-semibold uppercase tracking-wider text-slate-500">Gatilho</TableHead>
                                            <TableHead className="h-12 text-xs font-semibold uppercase tracking-wider text-slate-500">Ação</TableHead>
                                            <TableHead className="h-12 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                                            <TableHead className="text-right pr-6 h-12 text-xs font-semibold uppercase tracking-wider text-slate-500">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {automations.map((automation) => (
                                            <TableRow key={automation.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
                                                <TableCell className="font-medium pl-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                                            <Bot className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{automation.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                        <Clock className="h-4 w-4 text-slate-400" />
                                                        <span className="text-sm">{getTriggerDisplay(automation)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                        <Send className="h-4 w-4 text-emerald-500" />
                                                        <span className="text-sm">{getActionDisplay(automation)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={automation.status === 'active'
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"}
                                                    >
                                                        {automation.status === 'active' ? 'Ativa' : 'Pausada'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedAutomation(automation);
                                                                setRunDialogOpen(true);
                                                            }}
                                                            title="Executar automação"
                                                            className="h-8 w-8 rounded-full hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                                                        >
                                                            {processingAutomationId === automation.id ?
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /> :
                                                                <Play className="h-4 w-4" />
                                                            }
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditAutomation(automation)}
                                                            title="Editar automação"
                                                            className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteAutomation(automation.id)}
                                                            title="Excluir automação"
                                                            className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
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

                    {/* Dialog de Confirmação de Execução */}
                    <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
                        <DialogContent className="max-w-md rounded-3xl">
                            <DialogHeader>
                                <DialogTitle>Executar {selectedAutomation?.name}?</DialogTitle>
                                <DialogDescription>
                                    Escolha como deseja executar esta automação.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-3 py-4">
                                <Button
                                    variant="outline"
                                    onClick={() => handleRunAutomation(selectedAutomation, 'test')}
                                    className="justify-start h-12 text-left"
                                >
                                    <div className="flex flex-col items-start ml-2">
                                        <span className="font-semibold text-slate-900 dark:text-slate-100">🧪 Executar Teste</span>
                                        <span className="text-xs text-muted-foreground">Envia 1 mensagem para verificação.</span>
                                    </div>
                                </Button>
                                <Button
                                    onClick={() => handleRunAutomation(selectedAutomation, 'execute')}
                                    className="justify-start h-12 text-left bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <div className="flex flex-col items-start ml-2">
                                        <span className="font-semibold">🚀 Executar para Todos</span>
                                        <span className="text-xs text-emerald-100">Processa todos os contatos elegíveis agora.</span>
                                    </div>
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Dialog de Relatório de Execução */}
                    <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                        <DialogContent className="max-w-md rounded-3xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    ✅ Execução Concluída
                                </DialogTitle>
                                <DialogDescription>
                                    Resumo da execução da automação.
                                </DialogDescription>
                            </DialogHeader>
                            {executionResult && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl text-center border border-green-100 dark:border-green-900">
                                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{executionResult.successCount}</p>
                                            <p className="text-sm font-medium text-green-800 dark:text-green-300">Enviados</p>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl text-center border border-red-100 dark:border-red-900">
                                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{executionResult.failureCount}</p>
                                            <p className="text-sm font-medium text-red-800 dark:text-red-300">Falhas</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-center text-muted-foreground">
                                        Uma notificação foi gerada no sistema com este resumo.
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end mt-4">
                                <Button onClick={() => setReportDialogOpen(false)} className="w-full rounded-xl">Fechar</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                </div>
            </div>
        </>
    );
};

export default Automations;

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Save, X, Plus, Trash2 } from 'lucide-react';

const AutomationForm = ({ automation, onSave, onCancel, isLoading = false }) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        trigger_type: 'manual',
        trigger_config: {},
        action_type: 'whatsapp_message',
        action_config: {
            message_template: '',
            use_template: false
        },
        filter_config: {
            filters: []
        },
        status: 'active'
    });

    const [filters, setFilters] = useState([]);

    useEffect(() => {
        if (automation) {
            setFormData({
                name: automation.name || '',
                description: automation.description || '',
                trigger_type: automation.trigger_type || 'manual',
                trigger_config: automation.trigger_config || {},
                action_type: automation.action_type || 'whatsapp_message',
                action_config: automation.action_config || { message_template: '', use_template: false },
                filter_config: automation.filter_config || { filters: [] },
                status: automation.status || 'active'
            });
            setFilters(automation.filter_config?.filters || []);
        }
    }, [automation]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleTriggerConfigChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            trigger_config: {
                ...prev.trigger_config,
                [field]: value
            }
        }));
    };

    const handleActionConfigChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            action_config: {
                ...prev.action_config,
                [field]: value
            }
        }));
    };

    const addFilter = () => {
        const newFilter = {
            id: Date.now().toString(),
            type: 'birthday',
            operator: 'equals',
            value: ''
        };
        setFilters(prev => [...prev, newFilter]);
    };

    const removeFilter = (filterId) => {
        setFilters(prev => prev.filter(f => f.id !== filterId));
    };

    const updateFilter = (filterId, field, value) => {
        setFilters(prev => prev.map(f =>
            f.id === filterId ? { ...f, [field]: value } : f
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast({
                title: 'Erro de validação',
                description: 'O nome da automação é obrigatório.',
                variant: 'destructive'
            });
            return;
        }

        if (formData.action_type === 'whatsapp_message' && !formData.action_config.message_template?.trim()) {
            toast({
                title: 'Erro de validação',
                description: 'A mensagem do WhatsApp é obrigatória.',
                variant: 'destructive'
            });
            return;
        }

        const automationData = {
            ...formData,
            filter_config: {
                filters: filters
            }
        };

        onSave(automationData);
    };

    const filterTypes = [
        { value: 'birthday', label: 'Aniversário' },
        { value: 'has_appointments', label: 'Possui consultas' },
        { value: 'last_appointment_days', label: 'Última consulta (dias)' },
        { value: 'patient_status', label: 'Status do paciente' },
        { value: 'has_phone', label: 'Possui telefone' },
        { value: 'age_range', label: 'Faixa etária' }
    ];

    const triggerTypes = [
        { value: 'manual', label: 'Manual' },
        { value: 'scheduled', label: 'Agendado' },
        { value: 'event', label: 'Evento' }
    ];

    const actionTypes = [
        { value: 'whatsapp_message', label: 'Mensagem WhatsApp' },
        { value: 'email', label: 'E-mail' },
        { value: 'sms', label: 'SMS' }
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <Card>
                <CardHeader>
                    <CardTitle>Informações Básicas</CardTitle>
                    <CardDescription>
                        Configure o nome e descrição da automação
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Automação *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Ex: Lembrete de Consulta"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Descreva o propósito desta automação..."
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Gatilho */}
            <Card>
                <CardHeader>
                    <CardTitle>Gatilho</CardTitle>
                    <CardDescription>
                        Quando esta automação deve ser executada
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="trigger_type">Tipo de Gatilho</Label>
                        <Select
                            value={formData.trigger_type}
                            onValueChange={(value) => handleInputChange('trigger_type', value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {triggerTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.trigger_type === 'scheduled' && (
                        <div className="space-y-2">
                            <Label htmlFor="schedule">Horário de Execução</Label>
                            <Input
                                id="schedule"
                                type="datetime-local"
                                value={formData.trigger_config.schedule || ''}
                                onChange={(e) => handleTriggerConfigChange('schedule', e.target.value)}
                            />
                        </div>
                    )}

                    {formData.trigger_type === 'event' && (
                        <div className="space-y-2">
                            <Label htmlFor="event_type">Tipo de Evento</Label>
                            <Select
                                value={formData.trigger_config.event_type || ''}
                                onValueChange={(value) => handleTriggerConfigChange('event_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o evento" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="patient_created">Novo Paciente</SelectItem>
                                    <SelectItem value="appointment_created">Nova Consulta</SelectItem>
                                    <SelectItem value="appointment_completed">Consulta Finalizada</SelectItem>
                                    <SelectItem value="birthday">Aniversário</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Ação */}
            <Card>
                <CardHeader>
                    <CardTitle>Ação</CardTitle>
                    <CardDescription>
                        O que a automação deve fazer quando disparada
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="action_type">Tipo de Ação</Label>
                        <Select
                            value={formData.action_type}
                            onValueChange={(value) => handleInputChange('action_type', value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {actionTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.action_type === 'whatsapp_message' && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="use_template"
                                    checked={formData.action_config.use_template || false}
                                    onCheckedChange={(checked) => handleActionConfigChange('use_template', checked)}
                                />
                                <Label htmlFor="use_template">Usar template de mensagem</Label>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message_template">
                                    Mensagem {formData.action_config.use_template ? '(Template)' : ''} *
                                </Label>
                                <Textarea
                                    id="message_template"
                                    value={formData.action_config.message_template || ''}
                                    onChange={(e) => handleActionConfigChange('message_template', e.target.value)}
                                    placeholder={formData.action_config.use_template ?
                                        "Ex: Olá {{nome}}! Lembrando da sua consulta amanhã às {{hora}}." :
                                        "Digite a mensagem que será enviada..."
                                    }
                                    rows={4}
                                    required
                                />
                                {formData.action_config.use_template && (
                                    <div className="text-sm text-muted-foreground">
                                        <p>Variáveis disponíveis: {'{{nome}}'}, {'{{telefone}}'}, {'{{data_consulta}}'}, {'{{hora}}'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros de Destinatários</CardTitle>
                    <CardDescription>
                        Defina quem receberá esta automação (opcional - se vazio, envia para todos os contatos)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {filters.map((filter, index) => (
                        <div key={filter.id} className="flex items-center gap-2 p-3 border rounded-lg">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                                <div>
                                    <Label className="text-xs">Tipo</Label>
                                    <Select
                                        value={filter.type}
                                        onValueChange={(value) => updateFilter(filter.id, 'type', value)}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filterTypes.map(type => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Operador</Label>
                                    <Select
                                        value={filter.operator}
                                        onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="equals">=</SelectItem>
                                            <SelectItem value="not_equals">≠</SelectItem>
                                            <SelectItem value="greater">Maior que</SelectItem>
                                            <SelectItem value="less">Menor que</SelectItem>
                                            <SelectItem value="contains">contém</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Valor</Label>
                                    <Input
                                        value={filter.value}
                                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                        className="h-8"
                                        placeholder="Digite o valor..."
                                    />
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFilter(filter.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={addFilter}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Filtro
                    </Button>
                </CardContent>
            </Card>

            {/* Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Status</CardTitle>
                    <CardDescription>
                        Controle se a automação está ativa ou pausada
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="status"
                            checked={formData.status === 'active'}
                            onCheckedChange={(checked) => handleInputChange('status', checked ? 'active' : 'paused')}
                        />
                        <Label htmlFor="status">
                            {formData.status === 'active' ? (
                                <Badge variant="default">Ativa</Badge>
                            ) : (
                                <Badge variant="outline">Pausada</Badge>
                            )}
                        </Label>
                    </div>
                </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Salvando...' : 'Salvar Automação'}
                </Button>
            </div>
        </form>
    );
};

export default AutomationForm;

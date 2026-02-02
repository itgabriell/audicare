import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, MessageCircle, Calendar } from 'lucide-react';
import { getRepairsByPatientId } from '@/database';
import { supabase } from '@/lib/customSupabaseClient';
import { useChatNavigation } from '@/hooks/useChatNavigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RepairDialog from '@/components/repairs/RepairDialog';
import { addRepair } from '@/database';
import { useToast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';

const STATUS_LABELS = {
    'received': 'Na Clínica',
    'sent_to_lab': 'Enviado (SP)',
    'in_lab': 'Em Reparo',
    'returning': 'Voltando',
    'ready': 'Pronto',
    'delivered': 'Entregue'
};

const STATUS_COLORS = {
    'received': 'bg-slate-500',
    'sent_to_lab': 'bg-blue-500',
    'in_lab': 'bg-purple-500',
    'returning': 'bg-sky-500',
    'ready': 'bg-green-500',
    'delivered': 'bg-green-700'
};

const PatientRepairs = ({ patientId }) => {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [patientDetails, setPatientDetails] = useState(null); // For dialog
    const { navigateToChat, loading: chatLoading } = useChatNavigation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleSaveRepair = async (repairData) => {
        try {
            await addRepair(repairData);
            toast({ title: "Sucesso", description: "Reparo criado com sucesso." });
            setDialogOpen(false);
            loadRepairs();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: error.message });
        }
    };

    useEffect(() => {
        if (patientId) loadRepairs();
    }, [patientId]);

    const loadRepairs = async () => {
        setLoading(true);
        try {
            const [repairsData, patientData] = await Promise.all([
                getRepairsByPatientId(patientId),
                // We need patient details for the dialog to show correct name in combobox
                // Assuming we can get it via a simple select or reusing a service
                supabase.from('patients').select('id, name, phone').eq('id', patientId).single()
            ]);

            setRepairs(repairsData || []);
            if (patientData.data) {
                setPatientDetails([patientData.data]); // Pass as array
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center text-muted-foreground">Carregando reparos...</div>;

    if (repairs.length === 0) {
        return (
            <>
                <div className="p-8 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 border-dashed">
                    <Wrench className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                    <h3 className="text-lg font-medium text-foreground">Nenhum reparo encontrado</h3>
                    <p className="text-sm text-muted-foreground mb-4">Este paciente não possui histórico de ordens de serviço.</p>
                    <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Adicionar Primeiro Reparo
                    </Button>
                </div>
                <RepairDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    onSave={handleSaveRepair}
                    initialPatientId={patientId}
                    patients={patientDetails || []}
                />
            </>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-primary" /> Histórico de Reparos
                </h2>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Novo Reparo
                </Button>
            </div>
            <div className="grid gap-3">
                {repairs.map(ticket => (
                    <Card key={ticket.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge className={`${STATUS_COLORS[ticket.status] || 'bg-slate-500'} text-white border-0`}>
                                        {STATUS_LABELS[ticket.status] || ticket.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {ticket.created_at ? format(new Date(ticket.created_at), "d 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-lg">{ticket.device_brand || 'Aparelho sem marca'}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{ticket.problem_description}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {ticket.patient_phone && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-green-600 border-green-200 hover:bg-green-50"
                                        onClick={() => navigateToChat({ name: ticket.patient_name, phone: ticket.patient_phone })}
                                        disabled={chatLoading}
                                    >
                                        <MessageCircle className="w-4 h-4 mr-2" /> Chat
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <RepairDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleSaveRepair}
                initialPatientId={patientId}
                patients={patientDetails || []}
            />
        </div>
    );
};

export default PatientRepairs;

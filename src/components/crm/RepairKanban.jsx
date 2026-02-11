import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Wrench, Calendar, Smartphone, Hash, ArrowRight, ArrowLeft, Pencil, Trash2, X, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useChatNavigation } from '@/hooks/useChatNavigation';
import { getPatients, migrateRepairsToClinic, addRepair, updateRepair } from '@/database';
import { MoreHorizontal } from 'lucide-react';
import RepairDialog from '@/components/repairs/RepairDialog';

const COLUMNS = [
    { id: 'received', title: '📥 Na Clínica (Gaveta)', color: 'border-t-4 border-slate-500 bg-slate-50/50 dark:bg-slate-900/20' },
    { id: 'sent_to_lab', title: '🚚 Enviado (SP)', color: 'border-t-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' },
    { id: 'in_lab', title: '🛠️ Em Reparo', color: 'border-t-4 border-slate-500 bg-slate-50/50 dark:bg-slate-900/20' },
    { id: 'returning', title: '🔙 Voltando', color: 'border-t-4 border-sky-500 bg-sky-50/50 dark:bg-sky-900/20' },
    { id: 'ready', title: '✅ Pronto p/ Retirada', color: 'border-t-4 border-green-500 bg-green-50/50 dark:bg-green-900/20' },
];

const RepairKanban = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [patients, setPatients] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const { toast } = useToast();
    const { navigateToChat, loading: chatLoading } = useChatNavigation();

    useEffect(() => {
        fetchTickets();
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        const { data } = await getPatients(1, 100);
        setPatients(data || []);
    };

    const fetchTickets = async () => {
        const { data, error } = await supabase
            .from('repair_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setTickets(data || []);
        setLoading(false);
    };

    const handleMigration = async () => {
        try {
            setLoading(true);
            const result = await migrateRepairsToClinic();
            if (result.success) {
                toast({ title: "Migração Concluída", description: result.message, variant: "default", className: "bg-green-500 text-white" });
                fetchTickets();
            } else {
                toast({ title: "Resultado da Migração", description: result.message, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Erro na Migração", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenNew = () => {
        setSelectedTicket(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (ticket) => {
        setSelectedTicket(ticket);
        setIsModalOpen(true);
    };

    const handleSaveRepair = async (repairData) => {
        try {
            if (selectedTicket) {
                await updateRepair(selectedTicket.id, repairData);
                toast({ title: "Sucesso", description: "OS Atualizada!" });
            } else {
                await addRepair(repairData);
                toast({ title: "Sucesso", description: "OS Criada!" });
            }
            setIsModalOpen(false);
            fetchTickets();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: error.message || "Erro ao salvar OS" });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja excluir esta Ordem de Serviço permanentemente?")) return;
        const { error } = await supabase.from('repair_tickets').delete().eq('id', id);
        if (error) {
            toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
        } else {
            toast({ title: "Excluído", description: "OS removida com sucesso." });
            setTickets(prev => prev.filter(t => t.id !== id));
        }
    };

    const moveTicket = async (id, currentStatus, direction) => {
        const statusOrder = COLUMNS.map(c => c.id);
        const currentIndex = statusOrder.indexOf(currentStatus);
        const nextIndex = currentIndex + direction;

        if (nextIndex < 0 || nextIndex >= statusOrder.length) return;

        const nextStatus = statusOrder[nextIndex];
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
        const { error } = await supabase.from('repair_tickets').update({ status: nextStatus }).eq('id', id);
        if (error) {
            toast({ title: "Erro ao mover", variant: "destructive" });
            fetchTickets();
        }
    };

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col p-2 md:p-6 bg-background">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 md:gap-3">
                        <Wrench className="h-6 w-6 md:h-8 md:w-8 text-primary" /> Central de Reparos
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Gerencie o fluxo de envio, conserto e retorno de aparelhos.
                    </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Button size="lg" className="w-full md:w-auto shadow-md h-11" onClick={handleOpenNew}>
                        <Plus className="mr-2 h-5 w-5" /> Nova Ordem de Serviço
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full md:w-auto border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30"
                        onClick={handleMigration}
                    >
                        <MoreHorizontal className="mr-2 h-5 w-5" /> Migrar Dados
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin md:scrollbar-default">
                <div className="flex gap-4 md:gap-6 min-w-max h-full px-1">
                    {COLUMNS.map(col => (
                        <div key={col.id} className={`w-[85vw] md:w-[320px] shrink-0 rounded-xl flex flex-col border shadow-sm ${col.color} snap-center`}>
                            <div className="p-4 border-b border-border/10 bg-background/40 backdrop-blur-sm rounded-t-xl flex justify-between items-center">
                                <span className="font-semibold text-foreground">{col.title}</span>
                                <Badge variant="secondary" className="font-mono">
                                    {tickets.filter(t => t.status === col.id).length}
                                </Badge>
                            </div>

                            <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                {tickets.filter(t => t.status === col.id).map(ticket => (
                                    <Card key={ticket.id} className="bg-card hover:bg-accent/50 transition-colors border-border shadow-sm group relative">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-foreground line-clamp-1 cursor-pointer hover:underline"
                                                        onClick={() => handleOpenEdit(ticket)}
                                                        title="Clique para editar"
                                                    >
                                                        {ticket.patient_name}
                                                    </h3>
                                                    <Badge variant="outline" className="text-[10px] mt-1 text-muted-foreground flex gap-1 items-center w-fit">
                                                        <Hash className="w-3 h-3" />
                                                        {ticket.id.slice(0, 4)}
                                                    </Badge>
                                                </div>

                                                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-green-500"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigateToChat({ name: ticket.patient_name, phone: ticket.patient_phone });
                                                        }}
                                                        disabled={chatLoading}
                                                        title="Abrir Conversa"
                                                    >
                                                        <MessageCircle className="w-3 h-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-blue-500" onClick={() => handleOpenEdit(ticket)}>
                                                        <Pencil className="w-3 h-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(ticket.id)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="text-xs text-muted-foreground flex flex-col gap-1">
                                                    {ticket.os_type === 'hearing_aid' && (
                                                        <span className="flex items-center gap-1">
                                                            <Wrench className="w-3 h-3" /> {ticket.device_brand} {ticket.device_model}
                                                        </span>
                                                    )}
                                                    {ticket.os_type === 'earmold_device' && (
                                                        <span className="flex items-center gap-1">
                                                            <Wrench className="w-3 h-3" /> Molde {ticket.mold_type === 'click' ? 'Click' : 'AASI'} ({ticket.side === 'bilateral' ? 'Bilat.' : ticket.side === 'left' ? 'E' : 'D'})
                                                        </span>
                                                    )}
                                                    {ticket.os_type === 'earmold_plug' && (
                                                        <span className="flex items-center gap-1">
                                                            <Wrench className="w-3 h-3" /> Tampão {ticket.color}
                                                        </span>
                                                    )}
                                                    {(!ticket.os_type || ticket.os_type === 'general') && (
                                                        <span className="flex items-center gap-1 italic">
                                                            <Wrench className="w-3 h-3" /> Reparo Geral
                                                        </span>
                                                    )}

                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-xs text-foreground/80 bg-muted/50 p-2 rounded-md line-clamp-2 italic border border-border/50">
                                                "{ticket.problem_description}"
                                            </div>

                                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-border/50">
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="h-7 px-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    disabled={col.id === 'received'}
                                                    onClick={() => moveTicket(ticket.id, col.id, -1)}
                                                    title="Voltar etapa"
                                                >
                                                    <ArrowLeft className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="h-7 px-2 text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                    disabled={col.id === 'ready'}
                                                    onClick={() => moveTicket(ticket.id, col.id, 1)}
                                                    title="Avançar etapa"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {tickets.filter(t => t.status === col.id).length === 0 && (
                                    <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/40 border-2 border-dashed border-muted-foreground/10 rounded-lg m-2">
                                        <span className="text-sm font-medium">Vazio</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <RepairDialog
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSave={handleSaveRepair}
                repair={selectedTicket}
                patients={patients}
            />
        </div>
    );
};

export default RepairKanban;
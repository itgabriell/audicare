import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Wrench, Calendar, Smartphone, Hash, ArrowRight, ArrowLeft, Pencil, Trash2, X, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useChatNavigation } from '@/hooks/useChatNavigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPatients } from '@/database';
import { PatientCombobox } from '@/components/appointments/PatientCombobox';

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
    const { toast } = useToast();
    const { navigateToChat, loading: chatLoading } = useChatNavigation();

    // Estado do formulário
    const [formData, setFormData] = useState({
        id: null, // Se tiver ID, é edição. Se null, é criação.
        patient_name: '',
        patient_phone: '',
        device_brand: '',
        problem_description: ''
    });

    useEffect(() => {
        fetchTickets();
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        const { data } = await getPatients(1, 100); // Fetch top 100 for now
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

    // Abre modal vazio para criar
    const handleOpenNew = () => {
        setFormData({ id: null, patient_id: null, patient_name: '', patient_phone: '', device_brand: '', problem_description: '' });
        setIsModalOpen(true);
    };

    // Abre modal preenchido para editar
    const handleOpenEdit = (ticket) => {
        setFormData({
            id: ticket.id,
            patient_id: ticket.patient_id || null,
            patient_name: ticket.patient_name,
            patient_phone: ticket.patient_phone,
            device_brand: ticket.device_brand,
            problem_description: ticket.problem_description
        });
        setIsModalOpen(true);
    };

    // Função Unificada: Cria ou Atualiza
    const handleSave = async () => {
        if (!formData.patient_name) return;

        let error = null;

        if (formData.id) {
            // --- MODO EDIÇÃO (UPDATE) ---
            const { error: updateError } = await supabase
                .from('repair_tickets')
                .update({
                    patient_id: formData.patient_id,
                    patient_name: formData.patient_name,
                    patient_phone: formData.patient_phone,
                    device_brand: formData.device_brand,
                    problem_description: formData.problem_description
                })
                .eq('id', formData.id);
            error = updateError;
        } else {
            // --- MODO CRIAÇÃO (INSERT) ---
            // Removemos o ID null antes de enviar para não dar erro
            const { id, ...newTicket } = formData;
            const { error: insertError } = await supabase
                .from('repair_tickets')
                .insert([newTicket]);
            error = insertError;
        }

        if (error) {
            toast({ title: "Erro", description: "Falha ao salvar OS", variant: "destructive" });
        } else {
            toast({ title: "Sucesso", description: formData.id ? "OS Atualizada!" : "OS Criada!" });
            setIsModalOpen(false);
            fetchTickets();
        }
    };

    // Função Excluir
    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja excluir esta Ordem de Serviço permanentemente?")) return;

        const { error } = await supabase.from('repair_tickets').delete().eq('id', id);

        if (error) {
            toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
        } else {
            toast({ title: "Excluído", description: "OS removida com sucesso." });
            // Atualização otimista local para ser instantâneo
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
            {/* HEADER DA PÁGINA */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 md:gap-3">
                        <Wrench className="h-6 w-6 md:h-8 md:w-8 text-primary" /> Central de Reparos
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Gerencie o fluxo de envio, conserto e retorno de aparelhos.
                    </p>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <Button size="lg" className="w-full md:w-auto shadow-md h-11" onClick={handleOpenNew}>
                        <Plus className="mr-2 h-5 w-5" /> Nova Ordem de Serviço
                    </Button>
                    {/* ... Dialog Content ... */}
                    <DialogContent className="sm:max-w-[500px] rounded-3xl bg-white dark:bg-slate-900 border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle>{formData.id ? 'Editar OS' : 'Abrir Nova OS'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Vincular Paciente (Busca Automática)</Label>
                                <div className="border rounded-md p-1">
                                    <PatientCombobox
                                        patients={patients}
                                        value={formData.patient_id}
                                        onChange={(val) => {
                                            const p = patients.find(x => x.id === val);
                                            if (p) {
                                                setFormData({
                                                    ...formData,
                                                    patient_id: p.id,
                                                    patient_name: p.name,
                                                    patient_phone: p.phone || ''
                                                });
                                            } else {
                                                setFormData({ ...formData, patient_id: val }); // If custom/cleared
                                            }
                                        }}
                                        onPatientsUpdate={fetchPatients}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome do Paciente</Label>
                                <Input
                                    value={formData.patient_name}
                                    onChange={e => setFormData({ ...formData, patient_name: e.target.value })}
                                    placeholder="Ex: Maria Silva"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input
                                    value={formData.patient_phone}
                                    onChange={e => setFormData({ ...formData, patient_phone: e.target.value })}
                                    placeholder="(61) 99999-9999"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Marca / Modelo</Label>
                            <Input
                                placeholder="Ex: Phonak Marvel M90"
                                value={formData.device_brand}
                                onChange={e => setFormData({ ...formData, device_brand: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição do Problema</Label>
                            <Textarea
                                placeholder="Ex: Aparelho mudo, troca de cápsula..."
                                value={formData.problem_description}
                                onChange={e => setFormData({ ...formData, problem_description: e.target.value })}
                                className="min-h-[100px]"
                            />
                        </div>
                        <Button onClick={handleSave} className="w-full mt-2">
                            {formData.id ? 'Salvar Alterações' : 'Gerar OS'}
                        </Button>

                    </DialogContent>
                </Dialog >
            </div >

            {/* ÁREA DO KANBAN */}
            < div className="flex-1 overflow-x-auto pb-4 scrollbar-thin md:scrollbar-default" >
                <div className="flex gap-4 md:gap-6 min-w-max h-full px-1">
                    {COLUMNS.map(col => (
                        <div key={col.id} className={`w-[85vw] md:w-[320px] shrink-0 rounded-xl flex flex-col border shadow-sm ${col.color} snap-center`}>

                            {/* Cabeçalho da Coluna */}
                            <div className="p-4 border-b border-border/10 bg-background/40 backdrop-blur-sm rounded-t-xl flex justify-between items-center">
                                <span className="font-semibold text-foreground">{col.title}</span>
                                <Badge variant="secondary" className="font-mono">
                                    {tickets.filter(t => t.status === col.id).length}
                                </Badge>
                            </div>

                            {/* Lista de Cards */}
                            <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                {tickets.filter(t => t.status === col.id).map(ticket => (
                                    <Card key={ticket.id} className="bg-card hover:bg-accent/50 transition-colors border-border shadow-sm group relative">
                                        <CardContent className="p-4 space-y-3">

                                            {/* Topo do Card (Ações de Edição) */}
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

                                                {/* Botões Edit/Delete (Visíveis no Hover ou fixos) */}
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

                                            {/* Detalhes */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Smartphone className="w-3 h-3" />
                                                    <span className="truncate">{ticket.device_brand || "Não informado"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>

                                            {/* Descrição Curta */}
                                            <div className="text-xs text-foreground/80 bg-muted/50 p-2 rounded-md line-clamp-2 italic border border-border/50">
                                                "{ticket.problem_description}"
                                            </div>

                                            {/* Botões de Movimento */}
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
            </div >
        </div >
    );
};

export default RepairKanban;
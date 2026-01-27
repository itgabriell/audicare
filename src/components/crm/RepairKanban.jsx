import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Wrench, Calendar, Smartphone, Hash, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Definição das colunas com cores semânticas e bordas de destaque
const COLUMNS = [
  { id: 'received', title: '📥 Na Clínica (Gaveta)', color: 'border-t-4 border-slate-500 bg-slate-50/50 dark:bg-slate-900/20' },
  { id: 'batching', title: '📦 Juntando Lote', color: 'border-t-4 border-orange-500 bg-orange-50/50 dark:bg-orange-900/20' },
  { id: 'sent_to_lab', title: '🚚 Enviado (SP)', color: 'border-t-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' },
  { id: 'in_lab', title: '🛠️ Em Reparo', color: 'border-t-4 border-purple-500 bg-purple-50/50 dark:bg-purple-900/20' },
  { id: 'returning', title: '🔙 Voltando', color: 'border-t-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' },
  { id: 'ready', title: '✅ Pronto p/ Retirada', color: 'border-t-4 border-green-500 bg-green-50/50 dark:bg-green-900/20' },
];

const RepairKanban = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const [newTicket, setNewTicket] = useState({
    patient_name: '', patient_phone: '', device_brand: '', problem_description: ''
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('repair_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setTickets(data || []);
    setLoading(false);
  };

  const createTicket = async () => {
    if (!newTicket.patient_name) return;
    
    const { error } = await supabase.from('repair_tickets').insert([newTicket]);
    
    if (error) {
        toast({ title: "Erro", description: "Falha ao criar OS", variant: "destructive" });
    } else {
        toast({ title: "Sucesso", description: "OS Criada com sucesso!" });
        setIsModalOpen(false);
        setNewTicket({ patient_name: '', patient_phone: '', device_brand: '', problem_description: '' });
        fetchTickets();
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
    <div className="h-[calc(100vh-80px)] flex flex-col p-6 bg-background">
      {/* HEADER DA PÁGINA */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Wrench className="h-8 w-8 text-primary"/> Central de Reparos
            </h1>
            <p className="text-muted-foreground mt-1">
                Gerencie o fluxo de envio, conserto e retorno de aparelhos.
            </p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="shadow-md">
                    <Plus className="mr-2 h-5 w-5"/> Nova Ordem de Serviço
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Abrir Nova OS</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome do Paciente</Label>
                            <Input 
                                value={newTicket.patient_name} 
                                onChange={e => setNewTicket({...newTicket, patient_name: e.target.value})} 
                                placeholder="Ex: Maria Silva"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input 
                                value={newTicket.patient_phone} 
                                onChange={e => setNewTicket({...newTicket, patient_phone: e.target.value})} 
                                placeholder="(61) 99999-9999"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Marca / Modelo</Label>
                        <Input 
                            placeholder="Ex: Phonak Marvel M90" 
                            value={newTicket.device_brand} 
                            onChange={e => setNewTicket({...newTicket, device_brand: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Descrição do Problema</Label>
                        <Textarea 
                            placeholder="Ex: Aparelho mudo, troca de cápsula..." 
                            value={newTicket.problem_description} 
                            onChange={e => setNewTicket({...newTicket, problem_description: e.target.value})} 
                            className="min-h-[100px]"
                        />
                    </div>
                    <Button onClick={createTicket} className="w-full mt-2">Confirmar e Gerar OS</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      {/* ÁREA DO KANBAN */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max h-full">
            {COLUMNS.map(col => (
                <div key={col.id} className={`w-[320px] rounded-xl flex flex-col border shadow-sm ${col.color}`}>
                    
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
                                    
                                    {/* Topo do Card */}
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="font-bold text-foreground line-clamp-1" title={ticket.patient_name}>
                                            {ticket.patient_name}
                                        </h3>
                                        <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground flex gap-1 items-center">
                                            <Hash className="w-3 h-3" />
                                            {ticket.id.slice(0,4)}
                                        </Badge>
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

                                    {/* Botões de Ação (Aparecem no Hover ou fixos em mobile) */}
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
    </div>
  );
};

export default RepairKanban;
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Truck, Wrench, CheckCircle, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const COLUMNS = [
  { id: 'received', title: '📥 Na Clínica', color: 'bg-gray-100' },
  { id: 'batching', title: '📦 Juntando Lote', color: 'bg-orange-50' },
  { id: 'sent_to_lab', title: '🚚 Enviado (SP)', color: 'bg-blue-50' },
  { id: 'in_lab', title: '🛠️ Em Reparo', color: 'bg-purple-50' },
  { id: 'returning', title: '🔙 Voltando', color: 'bg-indigo-50' },
  { id: 'ready', title: '✅ Pronto', color: 'bg-green-50' },
];

const RepairKanban = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Form State
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
        toast({ title: "Sucesso", description: "OS criada!" });
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

     // Atualização Otimista
     setTickets(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));

     const { error } = await supabase.from('repair_tickets').update({ status: nextStatus }).eq('id', id);
     
     if (error) {
         toast({ title: "Erro ao mover", variant: "destructive" });
         fetchTickets(); // Reverte
     } else {
         // Se chegou em "Pronto", podíamos avisar o paciente via Clara (Futuro)
         if (nextStatus === 'ready') {
             toast({ title: "Aparelho Pronto!", description: "Hora de avisar o paciente." });
         }
     }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Wrench className="h-6 w-6 text-blue-600"/> Gestão de Reparos
            </h2>
            <p className="text-gray-500 text-sm">Controle total das OS e envios para SP.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4"/> Nova OS
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome do Paciente</Label>
                            <Input value={newTicket.patient_name} onChange={e => setNewTicket({...newTicket, patient_name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input value={newTicket.patient_phone} onChange={e => setNewTicket({...newTicket, patient_phone: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Marca/Modelo</Label>
                        <Input placeholder="Ex: Phonak Marvel" value={newTicket.device_brand} onChange={e => setNewTicket({...newTicket, device_brand: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Descrição do Problema</Label>
                        <Textarea placeholder="Ex: Não liga, chiado..." value={newTicket.problem_description} onChange={e => setNewTicket({...newTicket, problem_description: e.target.value})} />
                    </div>
                    <Button onClick={createTicket} className="w-full">Gerar OS</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
        {COLUMNS.map(col => (
            <div key={col.id} className={`min-w-[280px] w-[280px] rounded-xl flex flex-col ${col.color} border border-white/50 shadow-sm`}>
                <div className="p-3 font-semibold text-gray-700 border-b border-black/5 flex justify-between">
                    {col.title}
                    <Badge variant="secondary" className="bg-white">{tickets.filter(t => t.status === col.id).length}</Badge>
                </div>
                
                <div className="p-2 flex-1 overflow-y-auto space-y-2">
                    {tickets.filter(t => t.status === col.id).map(ticket => (
                        <Card key={ticket.id} className="bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group">
                            <CardContent className="p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-sm text-gray-800 truncate">{ticket.patient_name}</span>
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                
                                <div className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-1 rounded">
                                    {ticket.device_brand} - {ticket.problem_description}
                                </div>

                                {/* Controles Rápidos */}
                                <div className="flex justify-between items-center pt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500"
                                        disabled={col.id === 'received'}
                                        onClick={() => moveTicket(ticket.id, col.id, -1)}
                                    >
                                        ←
                                    </Button>
                                    <Badge variant="outline" className="text-[10px]">OS #{ticket.id.slice(0,4)}</Badge>
                                    <Button 
                                        variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-green-500"
                                        disabled={col.id === 'delivered'}
                                        onClick={() => moveTicket(ticket.id, col.id, 1)}
                                    >
                                        →
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {tickets.filter(t => t.status === col.id).length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-xs italic">
                            Vazio
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default RepairKanban;
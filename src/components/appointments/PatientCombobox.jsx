import React, { useState } from "react"
import { Check, ChevronsUpDown, Plus, UserPlus, Mail, Phone, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function PatientCombobox({ patients = [], value, onChange, onPatientsUpdate }) {
  const [open, setOpen] = useState(false) 
  const [searchTerm, setSearchTerm] = useState("")
  
  const [isRegisterOpen, setIsRegisterOpen] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ name: "", phone: "", email: "" });

  const { toast } = useToast();

  const filteredPatients = patients.filter((patient) => {
    if (!patient) return false;
    const name = patient.name || "";
    const phone = patient.phone || "";
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || phone.includes(search);
  });

  const selectedPatient = patients.find((p) => p.id === value);
  const displayName = selectedPatient 
    ? (selectedPatient.name) 
    : "Selecione o paciente...";

  const openRegistrationModal = () => {
    setNewPatientData({ name: searchTerm, phone: "", email: "" });
    setOpen(false); 
    setIsRegisterOpen(true); 
  };

  const handleSaveNewPatient = async () => {
    if (!newPatientData.name) {
        toast({ title: "Erro", description: "O nome é obrigatório.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
        // 1. Pega o usuário logado para descobrir a clinic_id
        const { data: { user } } = await supabase.auth.getUser();
        
        let clinicId = null;

        if (user) {
            // Busca o perfil para pegar a clinic_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('clinic_id')
                .eq('id', user.id)
                .single();
            
            if (profile) clinicId = profile.clinic_id;
        }

        // 2. Insere o paciente JÁ com a clinic_id
        const { data, error } = await supabase
            .from('patients') 
            .insert([{ 
                name: newPatientData.name,
                phone: newPatientData.phone,
                email: newPatientData.email,
                clinic_id: clinicId, // VINCULA O PACIENTE À CLÍNICA
                status: 'active'     // Garante que não nasça como rascunho/inativo se tiver essa coluna
            }]) 
            .select()
            .single();

        if (error) throw error;

        toast({ title: "Sucesso", description: "Paciente cadastrado!" });
        
        if (onPatientsUpdate) onPatientsUpdate();
        onChange(data.id);
        
        setIsRegisterOpen(false);
        setSearchTerm("");
    } catch (error) {
        console.error("Erro ao criar paciente:", error);
        toast({ title: "Erro", description: "Erro ao salvar. Verifique se o email/cpf já existe.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className="truncate">{displayName}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}> 
            <CommandInput placeholder="Buscar por nome ou telefone..." value={searchTerm} onValueChange={setSearchTerm}/>
            <CommandList className="max-h-[300px] overflow-y-auto">
               {filteredPatients.length === 0 && searchTerm.length > 0 && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-900">
                      <div className="text-sm text-muted-foreground text-center py-2">Nenhum paciente encontrado.</div>
                      <Button className="w-full justify-start gap-2" onClick={openRegistrationModal}>
                          <UserPlus className="h-4 w-4" /> Cadastrar Novo: "{searchTerm}"
                      </Button>
                  </div>
               )}
               {filteredPatients.length > 0 && (
                  <CommandGroup>
                  {filteredPatients.slice(0, 50).map((patient) => (
                      <CommandItem key={patient.id} value={patient.id} onSelect={() => { onChange(patient.id); setOpen(false); setSearchTerm("") }} className="cursor-pointer">
                      <Check className={cn("mr-2 h-4 w-4", value === patient.id ? "opacity-100" : "opacity-0")}/>
                      <div className="flex flex-col">
                          <span className="font-medium">{patient.name}</span>
                          {patient.phone && <span className="text-xs text-muted-foreground">{patient.phone}</span>}
                      </div>
                      </CommandItem>
                  ))}
                  </CommandGroup>
               )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Novo Paciente Rápido</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground"/> Nome Completo</Label>
              <Input id="name" value={newPatientData.name} onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground"/> Celular / WhatsApp</Label>
              <Input id="phone" value={newPatientData.phone} onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground"/> Email (Opcional)</Label>
              <Input id="email" value={newPatientData.email} onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveNewPatient} disabled={loading}>{loading ? "Salvando..." : "Salvar e Agendar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
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
  const [open, setOpen] = useState(false) // Controle do Combobox (Lista)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Novos estados para o Modal de Cadastro Rápido
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

  // 1. Abre o modal e já preenche o nome com o que foi digitado na busca
  const openRegistrationModal = () => {
    setNewPatientData({ name: searchTerm, phone: "", email: "" });
    setOpen(false); // Fecha a lista
    setIsRegisterOpen(true); // Abre o formulário
  };

  // 2. Salva o paciente com os dados completos
  const handleSaveNewPatient = async () => {
    if (!newPatientData.name) {
        toast({ title: "Erro", description: "O nome é obrigatório.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('patients') 
            .insert([{ 
                name: newPatientData.name,
                phone: newPatientData.phone,
                email: newPatientData.email
            }]) 
            .select()
            .single();

        if (error) throw error;

        toast({ title: "Sucesso", description: "Paciente cadastrado!" });
        
        // Atualiza a lista geral
        if (onPatientsUpdate) onPatientsUpdate();
        
        // Já deixa selecionado o novo paciente
        onChange(data.id);
        
        // Limpa tudo
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
      {/* --- COMBOBOX DE BUSCA --- */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{displayName}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}> 
            <CommandInput 
              placeholder="Buscar por nome ou telefone..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList className="max-h-[300px] overflow-y-auto">
               {/* Se não achar ninguém, mostra botão de Cadastrar */}
               {filteredPatients.length === 0 && searchTerm.length > 0 && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-900">
                      <div className="text-sm text-muted-foreground text-center py-2">
                          Nenhum paciente encontrado.
                      </div>
                      <Button 
                          className="w-full justify-start gap-2"
                          onClick={openRegistrationModal}
                      >
                          <UserPlus className="h-4 w-4" />
                          Cadastrar Novo: "{searchTerm}"
                      </Button>
                  </div>
               )}
               
               {filteredPatients.length > 0 && (
                  <CommandGroup>
                  {filteredPatients.slice(0, 50).map((patient) => (
                      <CommandItem
                      key={patient.id}
                      value={patient.id}
                      onSelect={() => {
                          onChange(patient.id)
                          setOpen(false)
                          setSearchTerm("") 
                      }}
                      className="cursor-pointer"
                      >
                      <Check
                          className={cn(
                          "mr-2 h-4 w-4",
                          value === patient.id ? "opacity-100" : "opacity-0"
                          )}
                      />
                      <div className="flex flex-col">
                          <span className="font-medium">{patient.name}</span>
                          {patient.phone && (
                              <span className="text-xs text-muted-foreground">{patient.phone}</span>
                          )}
                      </div>
                      </CommandItem>
                  ))}
                  </CommandGroup>
               )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* --- MODAL DE CADASTRO RÁPIDO --- */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Paciente Rápido</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="grid gap-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground"/> Nome Completo
              </Label>
              <Input
                id="name"
                value={newPatientData.name}
                onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                placeholder="Nome do paciente"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                 <Phone className="w-4 h-4 text-muted-foreground"/> Celular / WhatsApp
              </Label>
              <Input
                id="phone"
                value={newPatientData.phone}
                onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground"/> Email (Opcional)
              </Label>
              <Input
                id="email"
                value={newPatientData.email}
                onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveNewPatient} disabled={loading}>
                {loading ? "Salvando..." : "Salvar e Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
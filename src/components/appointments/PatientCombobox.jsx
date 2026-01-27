import React, { useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
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
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function PatientCombobox({ patients = [], value, onChange, onPatientsUpdate }) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const filteredPatients = patients.filter((patient) => {
    if (!patient) return false;
    const name = patient.name || patient.full_name || ""; // Suporta ambos caso mude no futuro
    const phone = patient.phone || "";
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || phone.includes(search);
  });

  const selectedPatient = patients.find((p) => p.id === value);
  const displayName = selectedPatient 
    ? (selectedPatient.name || selectedPatient.full_name) 
    : "Selecione o paciente...";

  // Função para criar paciente rápido
  const handleQuickCreate = async () => {
    if (!searchTerm) return;
    setLoading(true);

    try {
        // --- CORREÇÃO AQUI ---
        // Ajustado para o esquema da tabela: usa 'name' e remove 'status'
        const { data, error } = await supabase
            .from('patients') 
            .insert([{ name: searchTerm }]) 
            .select()
            .single();

        if (error) throw error;

        toast({ title: "Paciente Cadastrado", description: `${searchTerm} adicionado com sucesso.` });
        
        // Atualiza a lista pai se a função foi passada
        if (onPatientsUpdate) onPatientsUpdate();
        
        // Seleciona o novo paciente
        onChange(data.id);
        setOpen(false);
        setSearchTerm("");
    } catch (error) {
        console.error("Erro ao criar paciente:", error);
        toast({ title: "Erro", description: "Não foi possível cadastrar rápido. Verifique os dados.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
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
             {filteredPatients.length === 0 && searchTerm.length > 0 && (
                <div className="p-2">
                    <div className="text-sm text-muted-foreground text-center py-2">
                        Nenhum paciente encontrado.
                    </div>
                    <Button 
                        variant="secondary" 
                        className="w-full justify-start text-blue-600 hover:text-blue-700"
                        onClick={handleQuickCreate}
                        disabled={loading}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {loading ? "Salvando..." : `Cadastrar "${searchTerm}"`}
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
                        <span className="font-medium">{patient.name || patient.full_name}</span>
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
  )
}
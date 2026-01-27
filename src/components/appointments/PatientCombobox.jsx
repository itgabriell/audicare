import React, { useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
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

export function PatientCombobox({ patients = [], value, onChange }) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Filtra a lista localmente (nome ou telefone)
  const filteredPatients = patients.filter((patient) => {
    if (!patient) return false;
    const name = patient.name || patient.full_name || "";
    const phone = patient.phone || "";
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || phone.includes(search);
  });

  // Encontra o paciente selecionado para mostrar no botão
  const selectedPatient = patients.find((p) => p.id === value);
  const displayName = selectedPatient 
    ? (selectedPatient.name || selectedPatient.full_name) 
    : "Selecione o paciente...";

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
             {filteredPatients.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum paciente encontrado.
                    <br/>
                    <span className="text-xs opacity-70">Verifique a ortografia ou cadastre um novo.</span>
                </div>
             )}
             <CommandGroup>
              {filteredPatients.slice(0, 50).map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.id}
                  onSelect={() => {
                    onChange(patient.id)
                    setOpen(false)
                    setSearchTerm("") // Limpa busca ao selecionar
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
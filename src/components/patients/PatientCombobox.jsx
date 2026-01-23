import React, { useState } from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { addPatient } from "@/database";

const PatientCombobox = ({ patients = [], value, onChange, onPatientAdded }) => {
  const [open, setOpen] = useState(false);
  const [newPatientDialog, setNewPatientDialog] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const selectedPatient = Array.isArray(patients)
    ? patients.find((patient) => patient.id === value)
    : null;

  const handleCreatePatient = async () => {
    if (!newPatientName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do paciente é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const newPatient = await addPatient({
        name: newPatientName.trim(),
        phone: newPatientPhone.trim() || null,
      });

      // Atualizar lista de pacientes (se callback fornecido)
      if (onPatientAdded) {
        onPatientAdded(newPatient);
      }

      // Selecionar o novo paciente
      onChange(newPatient.id);

      toast({
        title: "Sucesso",
        description: "Paciente criado com sucesso!"
      });

      setNewPatientDialog(false);
      setNewPatientName("");
      setNewPatientPhone("");
      setOpen(false);
    } catch (error) {
      console.error("Erro ao criar paciente:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar paciente. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value
              ? selectedPatient?.name
              : "Selecione um paciente..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput
              placeholder="Buscar paciente..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty className="p-2">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewPatientDialog(true);
                      setOpen(false);
                    }}
                    className="w-full justify-start"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar novo paciente
                  </Button>
                </div>
              </CommandEmpty>

              {/* Opção de criar paciente aparece no topo quando há searchTerm */}
              {searchTerm.trim() && (
                <CommandGroup>
                  <CommandItem
                    value="CREATE_NEW_PATIENT_TRIGGER"
                    onSelect={() => {
                      setNewPatientName(searchTerm.trim());
                      setNewPatientDialog(true);
                      setOpen(false);
                    }}
                    className="border-b"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Criar "{searchTerm.trim()}"</span>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Lista de pacientes existentes */}
              <CommandGroup>
                {Array.isArray(patients) && patients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={patient.name}
                    onSelect={() => {
                      onChange(patient.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === patient.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{patient.name}</span>
                      {patient.phone && (
                        <span className="text-xs text-muted-foreground">{patient.phone}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              {/* Opção de criar paciente no final da lista (sem searchTerm) */}
              {Array.isArray(patients) && patients.length > 0 && !searchTerm.trim() && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setNewPatientDialog(true);
                        setOpen(false);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Criar novo paciente</span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Dialog para criar novo paciente */}
      <Dialog open={newPatientDialog} onOpenChange={setNewPatientDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Criar Novo Paciente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient-name">Nome *</Label>
              <Input
                id="patient-name"
                placeholder="Nome completo do paciente"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreatePatient();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-phone">Telefone</Label>
              <Input
                id="patient-phone"
                placeholder="(11) 99999-9999"
                value={newPatientPhone}
                onChange={(e) => setNewPatientPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreatePatient();
                  }
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setNewPatientDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePatient}
              disabled={loading || !newPatientName.trim()}
            >
              {loading ? "Criando..." : "Criar Paciente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PatientCombobox;

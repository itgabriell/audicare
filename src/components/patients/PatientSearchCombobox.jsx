import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { getPatients, searchPatientsSimple } from '@/services/patientService';

export function PatientSearchCombobox({ value, onChange, placeholder = "Buscar paciente...", disabled = false }) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (open) fetchPatients(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, open]);

    const fetchPatients = async (term) => {
        setLoading(true);
        try {
            // Fetch page 1, 20 items, sorted by name
            const data = await searchPatientsSimple(term);
            setPatients(data || []);
        } catch (error) {
            console.error("Error fetching patients:", error);
            setPatients([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (patient) => {
        onChange(patient.id);
        setSelectedLabel(patient.name);
        setOpen(false);
    };

    // If initial value is provided but no label, we might want to fetch that specific patient?
    // For now, assuming the parent might handle initial label or we leave it empty until search.
    // Ideally we would fetch the single patient if value exists and label is empty.

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    {selectedLabel || value && patients.find(p => p.id === value)?.name || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Digite para buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <CommandList>
                        {loading && <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Buscando...</div>}

                        {!loading && patients.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">Nenhum paciente encontrado.</div>
                        )}

                        {!loading && patients.length > 0 && (
                            <CommandGroup>
                                {patients.map((patient) => (
                                    <CommandItem
                                        key={patient.id}
                                        value={patient.id}
                                        onSelect={() => handleSelect(patient)}
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
                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                <span>CPF: {patient.cpf || '-'}</span>
                                                <span>•</span>
                                                <span>{patient.phone || '-'}</span>
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

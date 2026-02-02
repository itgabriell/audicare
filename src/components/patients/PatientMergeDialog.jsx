import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowRight, Merge, RefreshCw } from 'lucide-react';
import { PatientSearchCombobox } from './PatientSearchCombobox';
import { mergePatients } from '@/services/patientService';
import { useToast } from '@/components/ui/use-toast';

const PatientMergeDialog = ({ open, onOpenChange, onSuccess }) => {
    const [targetId, setTargetId] = useState(null);
    const [sourceId, setSourceId] = useState(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleMerge = async () => {
        if (!targetId || !sourceId) return;
        if (targetId === sourceId) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione pacientes diferentes." });
            return;
        }

        setLoading(true);
        try {
            await mergePatients(targetId, sourceId);
            toast({ title: "Sucesso", description: "Pacientes mesclados com sucesso." });
            onOpenChange(false);
            setTargetId(null);
            setSourceId(null);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro ao mesclar", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] rounded-2xl bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Merge className="h-5 w-5 text-primary" /> Mesclar Pacientes
                    </DialogTitle>
                    <DialogDescription>
                        Unifique registros duplicados. Todos os dados do perfil duplicado serão movidos para o perfil principal.
                        <br />
                        <span className="text-red-500 font-semibold">Atenção: O perfil duplicado será excluído permanentemente após a mesclagem.</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">

                        {/* Source (Deleted) */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-red-500">Duplicado (Será Excluído)</Label>
                            <div className="p-3 border-2 border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 rounded-xl">
                                <PatientSearchCombobox
                                    value={sourceId}
                                    onChange={setSourceId}
                                    placeholder="Buscar duplicado..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-center pt-6">
                            <ArrowRight className="text-slate-400" />
                        </div>

                        {/* Target (Kept) */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-green-600">Principal (Será Mantido)</Label>
                            <div className="p-3 border-2 border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10 rounded-xl">
                                <PatientSearchCombobox
                                    value={targetId}
                                    onChange={setTargetId}
                                    placeholder="Buscar principal..."
                                />
                            </div>
                        </div>
                    </div>

                    {targetId && sourceId && targetId === sourceId && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Conflito</AlertTitle>
                            <AlertDescription>Você selecionou o mesmo paciente para origem e destino. Escolha pacientes diferentes.</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="rounded-xl">Cancelar</Button>
                    <Button
                        onClick={handleMerge}
                        disabled={!targetId || !sourceId || targetId === sourceId || loading}
                        variant="default"
                        className="rounded-xl bg-primary hover:bg-primary/90"
                    >
                        {loading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : 'Confirmar Mesclagem'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PatientMergeDialog;

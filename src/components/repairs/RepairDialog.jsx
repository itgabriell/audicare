import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientSearchCombobox } from '@/components/patients/PatientSearchCombobox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Wrench } from 'lucide-react';

const RepairDialog = ({ open, onOpenChange, onSave, repair, initialPatientId }) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        patient_id: '',
        device_brand: '',
        device_model: '',
        serial_number: '',
        problem_description: '',
        status: 'received',
        price: '',
        delivery_date: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (repair) {
                setFormData({
                    patient_id: repair.patient_id,
                    device_brand: repair.device_brand || '',
                    device_model: repair.device_model || '',
                    serial_number: repair.serial_number || '',
                    problem_description: repair.problem_description || '',
                    status: repair.status || 'received',
                    price: repair.price || '',
                    delivery_date: repair.delivery_date ? repair.delivery_date.split('T')[0] : ''
                });
            } else {
                setFormData({
                    patient_id: initialPatientId || '',
                    device_brand: '',
                    device_model: '',
                    serial_number: '',
                    problem_description: '',
                    status: 'received',
                    price: '',
                    delivery_date: ''
                });
            }
        }
    }, [open, repair, initialPatientId]);

    const handleSubmit = async () => {
        if (!formData.patient_id) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione um paciente." });
            return;
        }
        if (!formData.problem_description) {
            toast({ variant: "destructive", title: "Erro", description: "Descreva o problema." });
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                // Format for DB if needed
            });
            // onSave handles closing usually, but if not:
            // onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] rounded-2xl bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-primary" /> {repair ? 'Editar Reparo' : 'Novo Reparo'}
                    </DialogTitle>
                    <DialogDescription>
                        {repair ? 'Atualize as informações do reparo.' : 'Cadastre uma nova ordem de serviço.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Paciente</Label>
                        <PatientSearchCombobox
                            value={formData.patient_id}
                            onChange={(val) => setFormData({ ...formData, patient_id: val })}
                            disabled={!!initialPatientId || !!repair} // Disable if creating from profile or editing
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Marca</Label>
                            <Input
                                value={formData.device_brand}
                                onChange={e => setFormData({ ...formData, device_brand: e.target.value })}
                                placeholder="Ex: Phonak"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Modelo</Label>
                            <Input
                                value={formData.device_model}
                                onChange={e => setFormData({ ...formData, device_model: e.target.value })}
                                placeholder="Ex: Audéo P90"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição do Problema</Label>
                        <Textarea
                            value={formData.problem_description}
                            onChange={e => setFormData({ ...formData, problem_description: e.target.value })}
                            placeholder="O aparelho não liga, som baixo, etc."
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={val => setFormData({ ...formData, status: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="received">Na Clínica</SelectItem>
                                    <SelectItem value="sent_to_lab">Enviado (SP)</SelectItem>
                                    <SelectItem value="in_lab">Em Reparo</SelectItem>
                                    <SelectItem value="returning">Voltando</SelectItem>
                                    <SelectItem value="ready">Pronto</SelectItem>
                                    <SelectItem value="delivered">Entregue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Data Prevista</Label>
                            <Input
                                type="date"
                                value={formData.delivery_date}
                                onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="rounded-xl">Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="rounded-xl"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Reparo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RepairDialog;

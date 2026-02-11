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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientCombobox } from '@/components/appointments/PatientCombobox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Wrench, Calendar, Ruler } from 'lucide-react';
import { format } from 'date-fns';

const RepairDialog = ({ open, onOpenChange, onSave, repair, initialPatientId, patients = [] }) => {
    const { toast } = useToast();

    // Default os_type to hearing_aid
    const [osType, setOsType] = useState('hearing_aid');
    const [moldSubType, setMoldSubType] = useState('aasi'); // 'aasi' or 'click'

    const [formData, setFormData] = useState({
        patient_id: '',
        patient_name: '',
        patient_phone: '',
        // Common
        problem_description: '',
        status: 'received',
        cost_estimate: '',
        expected_return_date: '',
        entry_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), // Default to now

        // Hearing Aid Fields
        device_brand: '',
        device_model: '',
        serial_number: '',
        side: 'right', // right, left, bilateral
        receiver: '', // also for click mold
        dome: '',

        // Mold Fields
        mold_material: 'silicone', // silicone, acrylic
        mold_type: 'shell', // shell, half_shell, canal, other (for AASI)
        vent: 'with', // with, without
        color: '', // for plug
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (repair) {
                setOsType(repair.os_type || 'hearing_aid');
                // Infer mold sub type based on fields if needed, or just default 'aasi'
                // For now, simpler to default 'aasi' if editing mold, user can switch check

                setFormData({
                    patient_id: '',
                    patient_name: repair.patient_name || '',
                    patient_phone: repair.patient_phone || '',
                    problem_description: repair.problem_description || '',
                    status: repair.status || 'received',
                    cost_estimate: repair.cost_estimate || '',
                    expected_return_date: repair.expected_return_date ? repair.expected_return_date.split('T')[0] : '',
                    entry_date: repair.entry_date ? new Date(repair.entry_date).toISOString().slice(0, 16) : format(new Date(), "yyyy-MM-dd'T'HH:mm"),

                    device_brand: repair.device_brand || '',
                    device_model: repair.device_model || '',
                    serial_number: repair.serial_number || '',
                    side: repair.side || 'right',
                    receiver: repair.receiver || '',
                    dome: repair.dome || '',
                    mold_material: repair.mold_material || 'silicone',
                    mold_type: repair.mold_type || 'shell',
                    vent: repair.vent || 'with',
                    color: repair.color || '',
                });
            } else {
                setFormData(prev => ({
                    ...prev,
                    patient_id: initialPatientId || '',
                    patient_name: '',
                    patient_phone: '',
                    problem_description: '',
                    status: 'received',
                    cost_estimate: '',
                    expected_return_date: '',
                    entry_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                    device_brand: '',
                    device_model: '',
                    serial_number: '',
                    side: 'right',
                    receiver: '',
                    dome: '',
                    mold_material: 'silicone',
                    mold_type: 'shell',
                    vent: 'with',
                    color: '',
                }));
                // Reset type to default creating new
                setOsType('hearing_aid');
            }
        }
    }, [open, repair, initialPatientId]);

    // Update name/phone when patient_id changes
    useEffect(() => {
        if (formData.patient_id && patients.length > 0) {
            const p = patients.find(x => x.id === formData.patient_id);
            if (p) {
                setFormData(prev => ({
                    ...prev,
                    patient_name: p.name,
                    patient_phone: p.phone
                }));
            }
        }
    }, [formData.patient_id, patients]);

    const handleSubmit = async () => {
        // Validation removed as per user request (nothing is mandatory)
        /*
        if (!formData.patient_name) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione um paciente." });
            return;
        }
        */

        setIsSubmitting(true);
        try {
            // Prepare payload based on osType
            const payload = {
                os_type: osType,
                patient_name: formData.patient_name,
                patient_phone: formData.patient_phone,
                problem_description: formData.problem_description,
                status: formData.status,
                cost_estimate: formData.cost_estimate === '' ? null : formData.cost_estimate,
                expected_return_date: formData.expected_return_date === '' ? null : formData.expected_return_date,
                entry_date: new Date(formData.entry_date).toISOString(),
            };

            // Add specific fields
            if (osType === 'hearing_aid') {
                payload.device_brand = formData.device_brand;
                payload.device_model = formData.device_model;
                payload.serial_number = formData.serial_number;
                payload.side = formData.side;
                payload.receiver = formData.receiver;
                payload.dome = formData.dome;
            } else if (osType === 'earmold_device') {
                // Determine if AASI or Click based on moldSubType state (which is internal only for UI, need to persist logic?)
                // Actually, maybe store 'sub_type' in database or reuse fields appropriately.
                // The requirements separate fields.

                payload.side = formData.side;
                payload.vent = formData.vent;

                if (moldSubType === 'aasi') {
                    payload.mold_material = formData.mold_material;
                    payload.mold_type = formData.mold_type; // shell, etc.
                } else {
                    // Click
                    payload.device_brand = formData.device_brand; // Model/Brand
                    payload.device_model = formData.device_model;
                    payload.receiver = formData.receiver;
                    payload.mold_type = 'click'; // Mark as click
                    // Size -> reuse dome? or create size field? User said "S, M, P, HP".
                    // Let's reuse 'dome' field for generic 'size/dome' info or add 'size' field?
                    // I didn't add 'size' column. I'll use 'dome' field for 'Size' in click mold.
                    payload.dome = formData.dome; // Represents Size (S, M, P, HP)
                }
            } else if (osType === 'earmold_plug') {
                payload.color = formData.color;
            }
            // 'general' has no specific extra fields, just description

            await onSave(payload);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-primary" /> {repair ? 'Editar OS' : 'Nova Ordem de Serviço'}
                    </DialogTitle>
                    <DialogDescription>
                        Preencha os dados da OS abaixo.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Patient & Date Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Paciente *</Label>
                            <PatientCombobox
                                patients={patients}
                                value={formData.patient_id}
                                onChange={(val) => setFormData({ ...formData, patient_id: val })}
                                disabled={!!initialPatientId || !!repair}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data de Entrada</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="datetime-local"
                                    className="pl-9"
                                    value={formData.entry_date}
                                    onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <Tabs value={osType} onValueChange={setOsType} className="w-full">
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="hearing_aid">Aparelho</TabsTrigger>
                            <TabsTrigger value="earmold_device">Molde Aparelho</TabsTrigger>
                            <TabsTrigger value="earmold_plug">Tampão</TabsTrigger>
                            <TabsTrigger value="general">Geral</TabsTrigger>
                        </TabsList>

                        {/* --- APARELHOS AUDITIVOS --- */}
                        <TabsContent value="hearing_aid" className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Marca</Label>
                                    <Input value={formData.device_brand} onChange={e => setFormData({ ...formData, device_brand: e.target.value })} placeholder="Ex: Phonak" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Modelo</Label>
                                    <Input value={formData.device_model} onChange={e => setFormData({ ...formData, device_model: e.target.value })} placeholder="Ex: Audéo P90" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nº de Série</Label>
                                    <Input value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} placeholder="123456" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Lado</Label>
                                    <Select value={formData.side} onValueChange={v => setFormData({ ...formData, side: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="right">Direito</SelectItem>
                                            <SelectItem value="left">Esquerdo</SelectItem>
                                            <SelectItem value="bilateral">Bilateral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Receptor (Opcional)</Label>
                                    <Input value={formData.receiver} onChange={e => setFormData({ ...formData, receiver: e.target.value })} placeholder="Ex: 2xM" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Oliva (Opcional)</Label>
                                    <Input value={formData.dome} onChange={e => setFormData({ ...formData, dome: e.target.value })} placeholder="Ex: Aberta M" />
                                </div>
                            </div>
                        </TabsContent>

                        {/* --- MOLDE PARA APARELHOS --- */}
                        <TabsContent value="earmold_device" className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex justify-center mb-4">
                                <div className="inline-flex rounded-md shadow-sm" role="group">
                                    <Button
                                        type="button"
                                        variant={moldSubType === 'aasi' ? 'default' : 'outline'}
                                        className="rounded-l-lg border-r-0"
                                        onClick={() => setMoldSubType('aasi')}
                                    >
                                        Para AASI
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={moldSubType === 'click' ? 'default' : 'outline'}
                                        className="rounded-r-lg"
                                        onClick={() => setMoldSubType('click')}
                                    >
                                        Click / Receptor
                                    </Button>
                                </div>
                            </div>

                            {moldSubType === 'aasi' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Lado</Label>
                                        <Select value={formData.side} onValueChange={v => setFormData({ ...formData, side: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="right">Direito</SelectItem>
                                                <SelectItem value="left">Esquerdo</SelectItem>
                                                <SelectItem value="bilateral">Bilateral</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Material</Label>
                                        <Select value={formData.mold_material} onValueChange={v => setFormData({ ...formData, mold_material: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="silicone">Silicone</SelectItem>
                                                <SelectItem value="acrylic">Acrílico</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select value={formData.mold_type} onValueChange={v => setFormData({ ...formData, mold_type: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="shell">Concha</SelectItem>
                                                <SelectItem value="half_shell">Meia Concha</SelectItem>
                                                <SelectItem value="canal">Canal</SelectItem>
                                                <SelectItem value="other">Outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ventilação</Label>
                                        <Select value={formData.vent} onValueChange={v => setFormData({ ...formData, vent: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="with">Com Ventilação</SelectItem>
                                                <SelectItem value="without">Sem Ventilação</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Modelo/Marca</Label>
                                        <Input value={formData.device_brand} onChange={e => setFormData({ ...formData, device_brand: e.target.value })} placeholder="Ex: Signia Silk" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Receptor</Label>
                                        <Input value={formData.receiver} onChange={e => setFormData({ ...formData, receiver: e.target.value })} placeholder="Ex: 2xM" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Lado</Label>
                                        <Select value={formData.side} onValueChange={v => setFormData({ ...formData, side: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="right">Direito</SelectItem>
                                                <SelectItem value="left">Esquerdo</SelectItem>
                                                <SelectItem value="bilateral">Bilateral</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tamanho (S, M, P, HP)</Label>
                                        <Input value={formData.dome} onChange={e => setFormData({ ...formData, dome: e.target.value })} placeholder="Ex: M" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ventilação</Label>
                                        <Select value={formData.vent} onValueChange={v => setFormData({ ...formData, vent: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="with">Com Ventilação</SelectItem>
                                                <SelectItem value="without">Sem Ventilação</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* --- TAMPÃO --- */}
                        <TabsContent value="earmold_plug" className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
                            <div className="space-y-2">
                                <Label>Cor</Label>
                                <Input value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="Ex: Azul com brilho" />
                            </div>
                        </TabsContent>

                        {/* --- GERAL --- */}
                        <TabsContent value="general" className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Ruler className="h-4 w-4" />
                                Preencha a descrição abaixo com os detalhes do reparo.
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="space-y-2">
                        <Label>Descrição do Problema / Observações *</Label>
                        <Textarea
                            value={formData.problem_description}
                            onChange={e => setFormData({ ...formData, problem_description: e.target.value })}
                            placeholder="Descreva o problema ou detalhes do serviço..."
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
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
                            <Label>Orçamento (R$)</Label>
                            <Input
                                type="number"
                                value={formData.cost_estimate}
                                onChange={e => setFormData({ ...formData, cost_estimate: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Previsão de Retorno</Label>
                            <Input
                                type="date"
                                value={formData.expected_return_date}
                                onChange={e => setFormData({ ...formData, expected_return_date: e.target.value })}
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
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar OS'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RepairDialog;

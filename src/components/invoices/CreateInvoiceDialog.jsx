import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { InvoiceService } from '@/services/invoiceService';
import { getPatients, addPatient } from '@/services/patientService';
import { Loader2, Search, User, Receipt, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import PatientDialog from '@/components/patients/PatientDialog';

const CreateInvoiceDialog = ({ open, onOpenChange, onInvoiceCreated }) => {
    const { toast } = useToast();
    const [step, setStep] = useState(1); // 1: Select Patient, 2: Invoice Details
    const [loading, setLoading] = useState(false);

    // Patient Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchingPatients, setSearchingPatients] = useState(false);
    const [showDataValidation, setShowDataValidation] = useState(false);

    // Create Patient State
    const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
    const [newPatientInitialData, setNewPatientInitialData] = useState(null);

    // Invoice Form State
    const [formData, setFormData] = useState({
        amount: '',
        type: 'fono',
        description: '',
        paymentMethod: 'pix',
        installments: 1,
        emitForThirdParty: false,
        thirdPartyName: '',
        thirdPartyDocument: '',
        thirdPartyEmail: ''
    });

    const validatePatientFiscalData = (patient) => {
        const requiredFields = [];
        const warnings = [];
        if (!patient) return { requiredFields, warnings, isValid: false };

        if (!patient.cpf && !patient.document) requiredFields.push('CPF/CNPJ');
        if (!patient.name && !patient.full_name) requiredFields.push('Nome completo');
        const address = patient.address || {};
        if (!address.zip_code && !patient.zip_code) requiredFields.push('CEP');
        if (!address.street && !patient.street && !patient.rua) requiredFields.push('Rua/Logradouro');
        if (!address.number && !patient.number && !patient.numero) requiredFields.push('Número');
        if (!address.neighborhood && !patient.neighborhood && !patient.bairro) requiredFields.push('Bairro');
        if (!address.city && !patient.city && !patient.cidade) requiredFields.push('Cidade');
        if (!address.state && !patient.state && !patient.estado) requiredFields.push('Estado');

        if (!patient.email) warnings.push('E-mail não informado');

        return { requiredFields, warnings, isValid: requiredFields.length === 0 };
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (open && step === 1) {
                searchPatients();
            }
        }, 300); // Reduced to 300ms for responsiveness
        return () => clearTimeout(timer);
    }, [searchTerm, open, step]);

    const searchPatients = async () => {
        setSearchingPatients(true);
        try {
            // Increased limit to 50 for better reach
            const { data } = await getPatients(1, 50, searchTerm);
            setPatients(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setSearchingPatients(false);
        }
    };

    const handlePatientSelect = (patient) => {
        setSelectedPatient(patient);
        const validation = validatePatientFiscalData(patient);
        if (!validation.isValid || validation.warnings.length > 0) setShowDataValidation(true);
        setStep(2);
    };

    const handleOpenCreatePatient = () => {
        setNewPatientInitialData({ name: searchTerm });
        setIsPatientDialogOpen(true);
    };

    const handleCreatePatientConvert = async (patientData) => {
        // Wrapper to match PatientDialog's onSave expectation
        try {
            const newPatient = await addPatient(patientData);

            toast({
                title: "Paciente Criado",
                description: `${newPatient.name} foi cadastrado e selecionado.`,
            });

            // Auto-select the new patient
            setIsPatientDialogOpen(false);
            handlePatientSelect(newPatient); // Move to next step
            return { data: newPatient }; // Return expected format to Dialog
        } catch (error) {
            throw error; // Let Dialog handle error toast
        }
    };

    const handleFormChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.amount || !formData.description) {
            toast({
                variant: 'destructive',
                title: 'Campos Obrigatórios',
                description: 'Preencha o valor e a descrição.'
            });
            return;
        }

        if (formData.emitForThirdParty) {
            if (!formData.thirdPartyName || !formData.thirdPartyDocument) {
                toast({
                    variant: 'destructive',
                    title: 'Dados do Terceiro',
                    description: 'Nome e Documento são obrigatórios para emissão em nome de terceiros.'
                });
                return;
            }
        }

        setLoading(true);
        try {
            // Prepare Patient Data (Original or Third Party)
            let invoicePatientData = selectedPatient;

            if (formData.emitForThirdParty) {
                invoicePatientData = {
                    ...selectedPatient,
                    patient_name: formData.thirdPartyName,
                    patient_document: formData.thirdPartyDocument.replace(/\D/g, ''),
                    patient_email: formData.thirdPartyEmail || selectedPatient.email,
                    address: selectedPatient.address // Keep address for consistency unless third party address UI is added
                };
            }

            const payload = {
                patient: invoicePatientData,
                serviceItem: { description: formData.description },
                amount: formData.amount.replace(',', '.'), // Normalize currency
                type: formData.type,
                description: formData.description,
                paymentMethod: formData.paymentMethod,
                installments: formData.installments
            };

            const result = await InvoiceService.emitInvoice(payload);

            if (result.success) {
                const saveParams = {
                    patient: selectedPatient, // Save relation to the App Patient
                    amount: payload.amount,
                    type: formData.type,
                    description: formData.description,
                    paymentMethod: formData.paymentMethod,
                    installments: formData.installments,
                    model: null,
                    quantity: 1
                };

                await InvoiceService.saveInvoiceRecord(result, saveParams);

                toast({
                    title: 'Sucesso',
                    description: 'Nota fiscal emitida com sucesso!',
                });
                onInvoiceCreated?.();
                onOpenChange(false);
                resetForm();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro na Emissão',
                description: error.message || 'Falha ao processar solicitação.'
            });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setSelectedPatient(null);
        setSearchTerm('');
        setFormData({
            amount: '',
            type: 'fono',
            description: '',
            paymentMethod: 'pix',
            installments: 1,
            emitForThirdParty: false,
            thirdPartyName: '',
            thirdPartyDocument: '',
            thirdPartyEmail: ''
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => {
                if (!val) resetForm();
                onOpenChange(val);
            }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Nova Nota Fiscal</DialogTitle>
                        <DialogDescription>
                            {step === 1 ? 'Selecione o paciente para emitir a nota.' : 'Preencha os detalhes da nota fiscal.'}
                        </DialogDescription>
                    </DialogHeader>

                    {step === 1 ? (
                        <div className="space-y-4 py-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar paciente (Nome, CPF)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                    autoFocus
                                />
                            </div>

                            <ScrollArea className="h-[300px] border rounded-md p-2 relative">
                                {searchingPatients ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
                                ) : patients.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                                        <div className="text-muted-foreground">Nenhum paciente encontrado.</div>
                                        {searchTerm && (
                                            <Button variant="outline" size="sm" onClick={handleOpenCreatePatient} className="gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/5">
                                                <UserPlus className="h-4 w-4" />
                                                Cadastrar "{searchTerm}"
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Always show Add Button at top if searching but results allow specificity */}
                                        {searchTerm && patients.length > 0 && !patients.some(p => p.name.toLowerCase() === searchTerm.toLowerCase()) && (
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start text-primary hover:text-primary hover:bg-primary/5 mb-2 h-auto py-2"
                                                onClick={handleOpenCreatePatient}
                                            >
                                                <UserPlus className="mr-2 h-4 w-4" /> Cadastrar novo "{searchTerm}"...
                                            </Button>
                                        )}

                                        {patients.map(p => (
                                            <Card
                                                key={p.id}
                                                className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                                                onClick={() => handlePatientSelect(p)}
                                            >
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{p.name}</p>
                                                    <p className="text-xs text-muted-foreground">{p.cpf || 'Sem CPF'}</p>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                                <User className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">{selectedPatient.name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedPatient.cpf}</p>
                                </div>
                                <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => setStep(1)}>Trocar</Button>
                            </div>

                            {/* Validation Alert */}
                            {showDataValidation && selectedPatient && (
                                <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg text-sm">
                                    <h4 className="font-semibold text-orange-800 mb-1 flex items-center gap-2">
                                        Atenção aos Dados
                                    </h4>
                                    {(() => {
                                        const validation = validatePatientFiscalData(selectedPatient);
                                        return (
                                            <div className="space-y-2">
                                                {validation.requiredFields.length > 0 && (
                                                    <div>
                                                        <p className="text-orange-700 font-medium text-xs">Faltando (Bloqueante):</p>
                                                        <p className="text-orange-600 text-xs">{validation.requiredFields.join(', ')}</p>
                                                    </div>
                                                )}
                                                {validation.warnings.length > 0 && (
                                                    <div>
                                                        <p className="text-orange-700 font-medium text-xs">Avisos:</p>
                                                        <p className="text-orange-600 text-xs">{validation.warnings.join(', ')}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Third Party Option */}
                            <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        id="thirdParty"
                                        checked={formData.emitForThirdParty}
                                        onChange={(e) => handleFormChange('emitForThirdParty', e.target.checked)}
                                        className="rounded border-slate-300 accent-primary"
                                    />
                                    <Label htmlFor="thirdParty" className="text-sm font-medium cursor-pointer">Emitir para Terceiro (Responsável)</Label>
                                </div>

                                {formData.emitForThirdParty && (
                                    <div className="grid grid-cols-1 gap-3 mt-3 animate-in fade-in slide-in-from-top-2">
                                        <Input
                                            placeholder="Nome Completo"
                                            value={formData.thirdPartyName}
                                            onChange={(e) => handleFormChange('thirdPartyName', e.target.value)}
                                            className="bg-white dark:bg-slate-900 h-9"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                placeholder="CPF/CNPJ"
                                                value={formData.thirdPartyDocument}
                                                onChange={(e) => handleFormChange('thirdPartyDocument', e.target.value)}
                                                className="bg-white dark:bg-slate-900 h-9"
                                            />
                                            <Input
                                                placeholder="Email (Opcional)"
                                                value={formData.thirdPartyEmail}
                                                onChange={(e) => handleFormChange('thirdPartyEmail', e.target.value)}
                                                className="bg-white dark:bg-slate-900 h-9"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Valor (R$)</Label>
                                    <Input
                                        placeholder="0,00"
                                        value={formData.amount}
                                        onChange={(e) => handleFormChange('amount', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select value={formData.type} onValueChange={(v) => handleFormChange('type', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fono">Fonoaudiologia</SelectItem>
                                            <SelectItem value="maintenance">Manutenção</SelectItem>
                                            <SelectItem value="sale">Venda</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Descrição do Serviço</Label>
                                <Input
                                    placeholder="Ex: Consulta Fonoaudiológica"
                                    value={formData.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {step === 2 && (
                            <div className="flex w-full justify-between">
                                <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>Voltar</Button>
                                <Button onClick={handleSubmit} disabled={loading} className="bg-primary">
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                                    Emitir Nota
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Patient Dialog Integration */}
            <PatientDialog
                open={isPatientDialogOpen}
                onOpenChange={setIsPatientDialogOpen}
                onSave={handleCreatePatientConvert}
                initialData={newPatientInitialData}
            />
        </>
    );
};

export default CreateInvoiceDialog;

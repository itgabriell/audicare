import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { getChannelConfig } from '@/lib/channels';
import { validateCredentials } from '@/lib/channelConfig';

/**
 * A dialog for adding or editing channel credentials.
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the dialog is open.
 * @param {Function} props.setIsOpen - Function to set the dialog's open state.
 * @param {import('@/lib/channels').ChannelType} props.channel - The channel being configured.
 * @param {object | null} props.initialCredentials - The initial credentials for editing.
 * @param {Function} props.onSave - The async function to call when saving credentials.
 */
const ChannelCredentialsDialog = ({ isOpen, setIsOpen, channel, initialCredentials, onSave }) => {
    const channelConfig = getChannelConfig(channel);
    const [credentials, setCredentials] = useState(initialCredentials || {});
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const formFields = {
        whatsapp: [{ name: 'zapi_token', label: 'Token da Z-API', placeholder: 'Seu token de segurança da Z-API' }],
        instagram: [
            { name: 'page_id', label: 'ID da Página do Instagram', placeholder: 'ID da sua página profissional' },
            { name: 'access_token', label: 'Token de Acesso da Meta', placeholder: 'Token de acesso gerado na Meta' },
        ],
        facebook: [
            { name: 'page_id', label: 'ID da Página do Facebook', placeholder: 'ID da sua página no Facebook' },
            { name: 'access_token', label: 'Token de Acesso da Meta', placeholder: 'Token de acesso gerado na Meta' },
        ],
    };

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setErrors({});

        const validationResult = validateCredentials(channel, credentials);
        if (!validationResult.success) {
            const fieldErrors = validationResult.error.flatten().fieldErrors;
            setErrors(fieldErrors);
            setIsSaving(false);
            return;
        }

        try {
            const result = await onSave(channel, validationResult.data);
            if (result.success) {
                toast({
                    title: 'Configurações Salvas',
                    description: result.message,
                });
                setIsOpen(false);
            } else {
                 toast({ variant: 'destructive', title: 'Erro ao Salvar', description: result.message });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro Inesperado', description: 'Não foi possível salvar as configurações.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!channel || !formFields[channel]) {
        // Render nothing or a fallback if the channel is not supported
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configurar {channelConfig.name}</DialogTitle>
                    <DialogDescription>
                        Insira as credenciais para conectar sua conta {channelConfig.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {formFields[channel].map(field => (
                        <div key={field.name} className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor={field.name} className="text-right col-span-1">
                                {field.label}
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={credentials[field.name] || ''}
                                    onChange={handleChange}
                                    placeholder={field.placeholder}
                                    className={errors[field.name] ? 'border-destructive' : ''}
                                />
                                {errors[field.name] && <p className="text-xs text-destructive mt-1">{errors[field.name][0]}</p>}
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ChannelCredentialsDialog;
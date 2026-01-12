import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Zap, Loader2 } from 'lucide-react';

/**
 * A button component to test the connection of a channel.
 * @param {object} props
 * @param {import('@/lib/channels').ChannelType} props.channel - The channel to test.
 * @param {Function} props.onTest - The async function to call to perform the test.
 */
const ChannelTestConnection = ({ channel, onTest }) => {
    const [isTesting, setIsTesting] = useState(false);
    const { toast } = useToast();

    const handleTest = async () => {
        setIsTesting(true);
        try {
            const result = await onTest(channel);
            if (result.success) {
                toast({
                    title: 'Sucesso!',
                    description: result.message,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Falha na Conexão',
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro Inesperado',
                description: 'Ocorreu um erro ao tentar testar a conexão.',
            });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Button onClick={handleTest} disabled={isTesting}>
            {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Zap className="mr-2 h-4 w-4" />
            )}
            {isTesting ? 'Testando...' : 'Testar Conexão'}
        </Button>
    );
};

export default ChannelTestConnection;
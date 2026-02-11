import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { chatwootService } from '@/services/chatwootService';
import { useToast } from '@/components/ui/use-toast';

const BulkRecoveryDialog = ({ open, onOpenChange, leads, onComplete }) => {
    const [message, setMessage] = useState("Olá! Tudo bem? Estou passando para verificar sobre sua audiometria. Podemos continuar?");
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
    const [results, setResults] = useState(null); // null, or { success: [], failed: [] }

    const { toast } = useToast();

    const handleSend = async () => {
        if (!leads || leads.length === 0) return;

        setIsSending(true);
        setProgress({ current: 0, total: leads.length, success: 0, failed: 0 });
        setResults({ success: [], failed: [] });

        const successList = [];
        const failedList = [];

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            setProgress(prev => ({ ...prev, current: i + 1 }));

            try {
                if (!lead.phone) {
                    throw new Error("Lead sem telefone");
                }

                // Send message via Chatwoot Service
                const result = await chatwootService.sendMessage(lead.phone, message, lead.name);

                if (result.success) {
                    successList.push({ name: lead.name, id: lead.id });
                    setProgress(prev => ({ ...prev, success: prev.success + 1 }));
                } else {
                    throw new Error(result.error || "Erro desconhecido");
                }
            } catch (error) {
                console.error(`Falha ao enviar para ${lead.name}:`, error);
                failedList.push({ name: lead.name, error: error.message });
                setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
            }

            // Small delay to prevent rate limiting if necessary, though backend handles it usually
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setIsSending(false);
        setResults({ success: successList, failed: failedList });

        if (onComplete) {
            onComplete(successList.length, failedList.length);
        }

        toast({
            title: "Disparo concluído",
            description: `${successList.length} enviados, ${failedList.length} falhas.`,
            variant: failedList.length > 0 ? "warning" : "default"
        });
    };

    const handleClose = () => {
        if (isSending) return; // Prevent closing while sending
        onOpenChange(false);
        // Reset state after close (optional, but good for UX)
        setTimeout(() => {
            setResults(null);
            setProgress({ current: 0, total: 0, success: 0, failed: 0 });
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Disparo em Massa - Recuperação</DialogTitle>
                    <DialogDescription>
                        Enviar mensagem para <b>{leads?.length}</b> leads na etapa "Recuperar".
                    </DialogDescription>
                </DialogHeader>

                {!results ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="message">Mensagem</Label>
                            <Textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Digite a mensagem de recuperação..."
                                className="min-h-[100px]"
                                disabled={isSending}
                            />
                        </div>

                        {isSending && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Enviando... {progress.current}/{progress.total}</span>
                                    <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                                <div className="flex gap-4 text-xs">
                                    <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {progress.success} Sucessos</span>
                                    <span className="text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {progress.failed} Falhas</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 dark:bg-green-900/20 dark:border-green-800">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">Processo Finalizado!</span>
                        </div>

                        <div className="space-y-1 text-sm">
                            <p>✅ <b>{results.success.length}</b> mensagens enviadas com sucesso.</p>
                            {results.failed.length > 0 && (
                                <div className="text-red-600 mt-2">
                                    <p className="font-bold">❌ {results.failed.length} falhas:</p>
                                    <ul className="list-disc pl-5 mt-1 max-h-[100px] overflow-y-auto text-xs">
                                        {results.failed.map((f, i) => (
                                            <li key={i}>{f.name}: {f.error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {!results ? (
                        <>
                            <Button variant="outline" onClick={handleClose} disabled={isSending}>Cancelar</Button>
                            <Button onClick={handleSend} disabled={isSending || !message.trim()}>
                                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSending ? 'Enviando...' : 'Enviar Mensagens'}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleClose}>Fechar</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BulkRecoveryDialog;

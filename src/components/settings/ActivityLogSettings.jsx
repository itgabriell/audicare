import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Shield, LogIn, FileEdit, Trash2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Dados simulados para o log de atividades
const MOCK_LOGS = [
    {
        id: 1,
        action: 'Login realizado com sucesso',
        type: 'login',
        device: 'Chrome / Windows 10',
        ip: '192.168.1.10',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    },
    {
        id: 2,
        action: 'Alteração de status do paciente: João Silva',
        type: 'edit',
        device: 'Chrome / Windows 10',
        ip: '192.168.1.10',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
        id: 3,
        action: 'Atualização das configurações de perfil',
        type: 'settings',
        device: 'Chrome / Windows 10',
        ip: '192.168.1.10',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    },
    {
        id: 4,
        action: 'Login realizado com sucesso',
        type: 'login',
        device: 'Safari / iPhone 13',
        ip: '177.12.34.56',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // 1 day 2h ago
    },
    {
        id: 5,
        action: 'Remoção de agendamento cancelado',
        type: 'delete',
        device: 'Chrome / Windows 10',
        ip: '192.168.1.10',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    },
];

const getIconForType = (type) => {
    switch (type) {
        case 'login': return <LogIn className="h-4 w-4 text-green-500" />;
        case 'edit': return <FileEdit className="h-4 w-4 text-blue-500" />;
        case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
        case 'settings': return <Settings className="h-4 w-4 text-orange-500" />;
        default: return <History className="h-4 w-4 text-gray-500" />;
    }
};

const ActivityLogSettings = () => {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Minhas Atividades
                </CardTitle>
                <CardDescription>
                    Registro de segurança das ações recentes realizadas na sua conta.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] w-full pr-4">
                    <div className="space-y-6">
                        {MOCK_LOGS.map((log) => (
                            <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors">
                                <div className="mt-1 h-9 w-9 rounded-full bg-background border flex items-center justify-center shadow-sm">
                                    {getIconForType(log.type)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-sm text-foreground">{log.action}</p>
                                        <time className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(log.timestamp), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                        </time>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            {log.device}
                                        </span>
                                        <span>•</span>
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                            IP: {log.ip}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default ActivityLogSettings;

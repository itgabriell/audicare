import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, Moon, Sun, Monitor, LayoutDashboard, List, Table } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const InterfaceSettings = () => {
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();

    const [defaultRoute, setDefaultRoute] = useState('/dashboard');
    const [tableDensity, setTableDensity] = useState('normal');

    useEffect(() => {
        // Carregar preferências salvas
        const savedRoute = localStorage.getItem('audicare_default_route');
        if (savedRoute) setDefaultRoute(savedRoute);

        const savedDensity = localStorage.getItem('audicare_table_density');
        if (savedDensity) setTableDensity(savedDensity);
    }, []);

    const handleSavePreferences = () => {
        localStorage.setItem('audicare_default_route', defaultRoute);
        localStorage.setItem('audicare_table_density', tableDensity);

        // Disparar evento customizado para densidade (opcional, se usar observer)
        window.dispatchEvent(new Event('storage'));

        toast({
            title: 'Preferências salvas',
            description: 'Suas configurações de interface foram atualizadas.',
            className: 'bg-green-100 border-green-500',
        });
    };

    return (
        <div className="space-y-6">
            {/* Tema */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Aparência
                    </CardTitle>
                    <CardDescription>Personalize o esquema de cores do sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid max-w-md grid-cols-3 gap-4">
                        <div
                            className={cn(
                                "cursor-pointer rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                                theme === 'light' && "border-primary"
                            )}
                            onClick={() => setTheme('light')}
                        >
                            <div className="flex flex-col items-center justify-between">
                                <Sun className="mb-3 h-6 w-6" />
                                <span className="font-medium">Light</span>
                            </div>
                        </div>
                        <div
                            className={cn(
                                "cursor-pointer rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                                theme === 'dark' && "border-primary"
                            )}
                            onClick={() => setTheme('dark')}
                        >
                            <div className="flex flex-col items-center justify-between">
                                <Moon className="mb-3 h-6 w-6" />
                                <span className="font-medium">Dark</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Comportamento Inicial */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5" />
                        Página Inicial
                    </CardTitle>
                    <CardDescription>Escolha qual tela você quer ver ao entrar no sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 max-w-md">
                        <Label htmlFor="default-route">Rota Padrão</Label>
                        <Select value={defaultRoute} onValueChange={setDefaultRoute}>
                            <SelectTrigger id="default-route">
                                <SelectValue placeholder="Selecione a página inicial" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="/dashboard">Dashboard (Resumo)</SelectItem>
                                <SelectItem value="/appointments">Agenda</SelectItem>
                                <SelectItem value="/crm">CRM (Funil de Vendas)</SelectItem>
                                <SelectItem value="/patients">Pacientes</SelectItem>
                                <SelectItem value="/inbox">Caixa de Entrada</SelectItem>
                                <SelectItem value="/tasks">Minhas Tarefas</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Esta será a primeira página carregada após o login.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Densidade de Dados */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <List className="h-5 w-5" />
                        Visualização de Dados
                    </CardTitle>
                    <CardDescription>Ajuste como as informações são exibidas nas tabelas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 max-w-md">
                        <Label>Densidade da Tabela</Label>
                        <div className="flex gap-2">
                            <Button
                                variant={tableDensity === 'compact' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTableDensity('compact')}
                                className="flex-1"
                            >
                                <List className="mr-2 h-4 w-4" />
                                Compacta
                            </Button>
                            <Button
                                variant={tableDensity === 'normal' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTableDensity('normal')}
                                className="flex-1"
                            >
                                <Table className="mr-2 h-4 w-4" />
                                Normal
                            </Button>
                            <Button
                                variant={tableDensity === 'comfortable' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTableDensity('comfortable')}
                                className="flex-1"
                            >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Expandida
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSavePreferences} className="w-full md:w-auto">
                    Salvar Preferências
                </Button>
            </div>
        </div>
    );
};

export default InterfaceSettings;

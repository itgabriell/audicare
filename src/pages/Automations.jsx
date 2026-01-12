import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Bot, Plus, Trash2, Send, Clock, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

// Mock data para automações. Em uma aplicação real, viria do banco de dados.
const initialAutomations = [
  { id: 1, name: 'Lembrete de Consulta', trigger: '24h antes da consulta', action: 'Enviar WhatsApp', status: 'active' },
  { id: 2, name: 'Boas-vindas a Novo Paciente', trigger: 'Após cadastro de paciente', action: 'Enviar WhatsApp', status: 'paused' },
  { id: 3, name: 'Feliz Aniversário', trigger: 'No dia do aniversário', action: 'Enviar WhatsApp', status: 'active' },
];

const Automations = () => {
    const [automations, setAutomations] = useState(initialAutomations);
    const { toast } = useToast();

    const handleCreateAutomation = () => {
        toast({
            title: '🚧 Funcionalidade em Construção',
            description: "A criação de novas automações ainda não foi implementada. Você pode solicitar este recurso!",
        });
    };

    const handleExecuteAutomation = (automation) => {
        toast({
            title: '🚧 Funcionalidade em Construção',
            description: `A execução manual da automação "${automation.name}" não está disponível.`,
        });
    };

    const handleDeleteAutomation = (automationId) => {
        // Em um app real, aqui você faria a chamada para a API
        setAutomations(prev => prev.filter(a => a.id !== automationId));
        toast({
            title: 'Automação Removida',
            description: 'A automação foi removida da lista (simulação).',
        });
    };

    return (
        <>
            <Helmet>
                <title>Automações - Audicare</title>
                <meta name="description" content="Gerencie automações e fluxos de trabalho para otimizar processos." />
            </Helmet>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Automações com Z-API</h1>
                        <p className="text-muted-foreground mt-1">Crie e gerencie fluxos de trabalho automatizados via WhatsApp.</p>
                    </div>
                    <Button onClick={handleCreateAutomation}>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Automação
                    </Button>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Fluxos de Trabalho Ativos</CardTitle>
                        <CardDescription>
                            Abaixo estão as automações configuradas. A lógica de execução (backend) ainda precisa ser implementada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome da Automação</TableHead>
                              <TableHead>Gatilho</TableHead>
                              <TableHead>Ação</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {automations.map((automation) => (
                              <TableRow key={automation.id}>
                                <TableCell className="font-medium">{automation.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{automation.trigger}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Send className="h-4 w-4 text-green-500" />
                                        <span>{automation.action}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={automation.status === 'active' ? 'default' : 'outline'}>
                                        {automation.status === 'active' ? 'Ativo' : 'Pausado'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => handleExecuteAutomation(automation)}>
                                    <Play className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteAutomation(automation.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>
        </>
    );
};

export default Automations;
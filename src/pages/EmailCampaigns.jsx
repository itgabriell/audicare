import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Mail, 
  Users, 
  FileText, 
  Calendar, 
  Send, 
  Loader2, 
  Play, 
  MoreHorizontal, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EmailCampaigns = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Dialog States
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  
  // Alert Dialog State
  const [deleteCampaignId, setDeleteCampaignId] = useState(null);

  // Form States
  const [newCampaign, setNewCampaign] = useState({ name: '', list_id: '', template_id: '', scheduled_at: '' });
  const [newList, setNewList] = useState({ name: '', description: '' });
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body_html: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, listsRes, templatesRes] = await Promise.all([
        supabase.from('email_campaigns').select('*, email_lists(name), email_templates(name)').order('created_at', { ascending: false }),
        supabase.from('email_lists').select('*').order('created_at', { ascending: false }),
        supabase.from('email_templates').select('*').order('created_at', { ascending: false })
      ]);

      if (campaignsRes.error) throw campaignsRes.error;
      if (listsRes.error) throw listsRes.error;
      if (templatesRes.error) throw templatesRes.error;

      setCampaigns(campaignsRes.data || []);
      setLists(listsRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.list_id || !newCampaign.template_id) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.from('email_campaigns').insert([{
        name: newCampaign.name,
        list_id: newCampaign.list_id,
        template_id: newCampaign.template_id,
        status: 'scheduled',
        scheduled_at: newCampaign.scheduled_at || new Date().toISOString(),
      }]);

      if (error) throw error;

      toast({ title: 'Campanha criada com sucesso!' });
      setIsCampaignDialogOpen(false);
      setNewCampaign({ name: '', list_id: '', template_id: '', scheduled_at: '' });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro ao criar campanha', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunCampaign = async (campaignId) => {
    setActionLoading(true);
    try {
      // Invoke the edge function to run the campaign immediately
      const { data, error } = await supabase.functions.invoke('run-email-campaign', {
        body: { campaign_id: campaignId }
      });

      if (error) throw error;

      toast({ 
        title: 'Envio iniciado!', 
        description: 'A campanha está sendo processada e os e-mails serão enviados em breve.' 
      });
      fetchData();
    } catch (error) {
      console.error('Error running campaign:', error);
      toast({ 
        title: 'Erro ao iniciar envio', 
        description: error.message || 'Verifique se a Edge Function está implantada corretamente.', 
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteCampaign = (id) => {
    setDeleteCampaignId(id);
  };

  const handleDeleteCampaign = async () => {
    if (!deleteCampaignId) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', deleteCampaignId);
      if (error) throw error;
      toast({ title: 'Campanha excluída' });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setDeleteCampaignId(null);
    }
  };

  const handleCreateList = async () => {
    if (!newList.name) {
      toast({ title: 'Nome obrigatório', description: 'Dê um nome para a lista.', variant: 'destructive' });
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.from('email_lists').insert([newList]);
      if (error) throw error;

      toast({ title: 'Lista criada com sucesso!' });
      setIsListDialogOpen(false);
      setNewList({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro ao criar lista', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body_html) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos do modelo.', variant: 'destructive' });
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.from('email_templates').insert([newTemplate]);
      if (error) throw error;

      toast({ title: 'Modelo criado com sucesso!' });
      setIsTemplateDialogOpen(false);
      setNewTemplate({ name: '', subject: '', body_html: '' });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro ao criar modelo', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
      processing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    };
    
    const labels = {
      sent: 'Enviado',
      scheduled: 'Agendado',
      draft: 'Rascunho',
      failed: 'Falhou',
      processing: 'Processando'
    };

    return (
      <Badge variant="outline" className={styles[status] || styles.draft}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <Helmet>
        <title>Campanhas de E-mail - Audicare</title>
        <meta name="description" content="Gerencie suas campanhas de e-mail marketing, listas de contatos e modelos." />
      </Helmet>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">E-mail Marketing</h1>
          <p className="text-muted-foreground">
            Crie e gerencie campanhas para engajar seus pacientes.
          </p>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Send className="w-4 h-4" /> <span className="hidden sm:inline">Campanhas</span>
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> <span className="hidden sm:inline">Listas</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Modelos</span>
          </TabsTrigger>
        </TabsList>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Nova Campanha</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Nova Campanha</DialogTitle>
                  <DialogDescription>Configure os detalhes da sua nova campanha de e-mail.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="camp-name">Nome da Campanha</Label>
                    <Input 
                      id="camp-name"
                      value={newCampaign.name} 
                      onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})} 
                      placeholder="Ex: Newsletter Mensal" 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Lista de Destinatários</Label>
                      <Select 
                        value={newCampaign.list_id} 
                        onValueChange={(val) => setNewCampaign({...newCampaign, list_id: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lists.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo de E-mail</Label>
                      <Select 
                        value={newCampaign.template_id} 
                        onValueChange={(val) => setNewCampaign({...newCampaign, template_id: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="camp-date">Data de Envio (Opcional)</Label>
                    <Input 
                      id="camp-date"
                      type="datetime-local" 
                      value={newCampaign.scheduled_at} 
                      onChange={(e) => setNewCampaign({...newCampaign, scheduled_at: e.target.value})} 
                    />
                    <p className="text-xs text-muted-foreground">Deixe em branco para enviar manualmente depois.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCampaignDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateCampaign} disabled={actionLoading}>
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Campanha
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campanhas Recentes</CardTitle>
              <CardDescription>Visualize e gerencie o status dos seus envios.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Lista</TableHead>
                    <TableHead className="hidden md:table-cell">Modelo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Agendado</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Mail className="h-8 w-8 text-muted-foreground/50" />
                          <p>Nenhuma campanha encontrada.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium pl-6">{campaign.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{campaign.email_lists?.name || 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">{campaign.email_templates?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {getStatusBadge(campaign.status)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {campaign.scheduled_at ? format(new Date(campaign.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => handleRunCampaign(campaign.id)}
                                disabled={campaign.status === 'sent' || campaign.status === 'processing'}
                              >
                                <Play className="mr-2 h-4 w-4" /> Enviar Agora
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => confirmDeleteCampaign(campaign.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LISTS TAB */}
        <TabsContent value="lists" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Nova Lista</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Lista de Contatos</DialogTitle>
                  <DialogDescription>Crie uma lista para segmentar seus contatos.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="list-name">Nome da Lista</Label>
                    <Input 
                      id="list-name"
                      value={newList.name} 
                      onChange={(e) => setNewList({...newList, name: e.target.value})} 
                      placeholder="Ex: Pacientes Ativos" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="list-desc">Descrição</Label>
                    <Textarea 
                      id="list-desc"
                      value={newList.description} 
                      onChange={(e) => setNewList({...newList, description: e.target.value})} 
                      placeholder="Descrição opcional..." 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsListDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateList} disabled={actionLoading}>
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Lista
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <Card key={list.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {list.name}
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{list.description || 'Sem descrição'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Criado em: {format(new Date(list.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </CardContent>
              </Card>
            ))}
            {lists.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed bg-muted/10">
                <Users className="h-10 w-10 mb-3 opacity-20" />
                <p>Nenhuma lista criada ainda.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Nova Modelo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Modelo de E-mail</DialogTitle>
                  <DialogDescription>Crie um template reutilizável para suas campanhas.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="tpl-name">Nome do Modelo</Label>
                    <Input 
                      id="tpl-name"
                      value={newTemplate.name} 
                      onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} 
                      placeholder="Ex: Boas-vindas" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tpl-subject">Assunto do E-mail</Label>
                    <Input 
                      id="tpl-subject"
                      value={newTemplate.subject} 
                      onChange={(e) => setNewTemplate({...newTemplate, subject: e.target.value})} 
                      placeholder="Assunto que aparecerá para o cliente" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tpl-body">Conteúdo HTML</Label>
                    <Textarea 
                      id="tpl-body"
                      className="min-h-[200px] font-mono text-sm"
                      value={newTemplate.body_html} 
                      onChange={(e) => setNewTemplate({...newTemplate, body_html: e.target.value})} 
                      placeholder="<div>Olá, ...</div>" 
                    />
                    <p className="text-xs text-muted-foreground">Use HTML para formatar o corpo do e-mail.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateTemplate} disabled={actionLoading}>
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Modelo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {template.name}
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription className="truncate">Assunto: {template.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground line-clamp-3 font-mono bg-muted p-3 rounded-md border">
                    {template.body_html}
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground pt-0">
                  Atualizado em: {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </CardFooter>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed bg-muted/10">
                <FileText className="h-10 w-10 mb-3 opacity-20" />
                <p>Nenhum modelo criado ainda.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCampaignId} onOpenChange={(open) => !open && setDeleteCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a campanha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmailCampaigns;
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
// CORREÇÃO 1: Adicionado Loader2 e Download (caso precise) nos imports
import { Search, Plus, FileText, Image as ImageIcon, Trash2, ExternalLink, Loader2, Download, Clock } from 'lucide-react';

// CORREÇÃO 2: Caminho atualizado para a pasta UI (onde você moveu o arquivo)
import UploadDocDialog from '@/components/ui/UploadDocDialog.jsx';

import { knowledgeBaseService } from '@/services/knowledgeBaseService';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Todos');
  const { toast } = useToast();

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await knowledgeBaseService.getDocuments();
      setDocs(data || []);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os documentos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDelete = async (doc) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    try {
      await knowledgeBaseService.deleteDocument(doc.id, doc.file_path);
      toast({ title: 'Sucesso', description: 'Documento removido.' });
      fetchDocs();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao remover documento.', variant: 'destructive' });
    }
  };

  const getIcon = (type) => {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type?.toLowerCase())) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-red-500" />;
  };

  const categories = ['Todos', ...new Set(docs.map(d => d.category))];
  const filteredDocs = docs.filter(doc => {
    const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.description?.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'Todos' || doc.category === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Base de Conhecimento</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manuais, protocolos e arquivos da clínica Audicare.</p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 h-10 px-6">
          <Plus className="mr-2 h-4 w-4" /> Novo Documento
        </Button>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          placeholder="Buscar por título, descrição ou categoria..."
          className="pl-11 h-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus-visible:ring-primary/20 transition-all text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="Todos" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="flex flex-wrap h-auto bg-transparent justify-start gap-2 p-0">
          {categories.map(cat => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="rounded-xl px-4 py-2 text-sm font-medium border border-transparent data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border-slate-200 dark:data-[state=active]:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-white hover:text-slate-900 transition-all"
            >
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary/50" />
              <p>Carregando documentos...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
              <FileText className="h-12 w-12 opacity-20 mb-4" />
              <p>Nenhum documento encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="group flex flex-col justify-between border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                      {getIcon(doc.file_type)}
                    </div>
                    <div className="flex-1 overflow-hidden pt-1">
                      <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 truncate leading-tight" title={doc.title}>{doc.title}</CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(doc.created_at), "d 'de' MMMM, yyyy", { locale: ptBR })}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[40px] leading-relaxed">
                      {doc.description || "Sem descrição disponível para este documento."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {doc.category}
                      </span>
                      {doc.file_type && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">
                          {doc.file_type}
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-3 pb-4 px-6 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/30 flex justify-between items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl h-9 w-9 p-0 transition-colors"
                      title="Excluir documento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl h-9 text-xs font-medium shadow-sm"
                    >
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5 mr-2" /> Baixar / Visualizar
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <UploadDocDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchDocs}
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Plus, FileText, Image as ImageIcon, Trash2, ExternalLink } from 'lucide-react';
import UploadDocDialog from '@/components/knowledge/UploadDocDialog';
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
    if(!confirm('Tem certeza que deseja excluir este documento?')) return;
    try {
      await knowledgeBaseService.deleteDocument(doc.id, doc.file_path);
      toast({ title: 'Sucesso', description: 'Documento removido.' });
      fetchDocs();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao remover documento.', variant: 'destructive' });
    }
  };

  const getIcon = (type) => {
    if (['jpg', 'jpeg', 'png', 'gif'].includes(type?.toLowerCase())) return <ImageIcon className="h-8 w-8 text-blue-500" />;
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Base de Conhecimento</h1>
          <p className="text-gray-500 mt-1">Manuais, protocolos e arquivos da clínica Audicare.</p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="mr-2 h-4 w-4" /> Novo Documento
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar por título ou descrição..." 
            className="pl-10 bg-white dark:bg-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="Todos" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto bg-transparent justify-start gap-2 p-0 mb-4">
          {categories.map(cat => (
            <TabsTrigger 
              key={cat} 
              value={cat}
              className="data-[state=active]:bg-primary data-[state=active]:text-white border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2"
            >
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="text-center py-10 text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2"/>Carregando documentos...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              Nenhum documento encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow group flex flex-col justify-between border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      {getIcon(doc.file_type)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <CardTitle className="text-lg truncate font-semibold" title={doc.title}>{doc.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {format(new Date(doc.created_at), "d 'de' MMMM, yyyy", { locale: ptBR })}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 min-h-[60px]">
                      {doc.description || "Sem descrição."}
                    </p>
                    <span className="inline-block mt-3 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">
                      {doc.category}
                    </span>
                  </CardContent>
                  <CardFooter className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" asChild className="border-primary text-primary hover:bg-primary hover:text-white">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> Abrir
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
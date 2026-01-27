import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Upload, FileText, Download, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';

const PatientDocuments = ({ patientId }) => {
  const [documents, setDocuments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]); // Arquivos na "fila"
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  // 1. Ao selecionar arquivos no computador
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      file,
      description: file.name.split('.')[0], // Sugere o nome do arquivo como descrição inicial
      id: Math.random().toString(36).substr(2, 9) // ID temporário
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  // 2. Remover da fila antes de subir
  const removeSelected = (id) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  // 3. Atualizar descrição na fila
  const updateDescription = (id, newDesc) => {
    setSelectedFiles(prev => prev.map(f => f.id === id ? { ...f, description: newDesc } : f));
  };

  // 4. Enviar tudo para o Supabase
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    try {
      for (const item of selectedFiles) {
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${patientId}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;

        // A) Upload para o Storage
        const { error: uploadError } = await supabase.storage
          .from('patient-documents')
          .upload(fileName, item.file);

        if (uploadError) throw uploadError;

        // B) Pegar URL Pública
        const { data: { publicUrl } } = supabase.storage
          .from('patient-documents')
          .getPublicUrl(fileName);

        // C) Salvar no Banco
        await supabase.from('patient_documents').insert({
          patient_id: patientId,
          file_name: item.file.name,
          description: item.description,
          file_url: publicUrl,
          file_type: fileExt,
          size: item.file.size
        });
      }

      toast({ title: "Sucesso!", description: "Documentos salvos com sucesso." });
      setSelectedFiles([]); // Limpa a fila
      fetchDocuments(); // Recarrega a lista
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao enviar documentos.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // 5. Deletar documento já salvo
  const handleDelete = async (id, url) => {
    if(!confirm("Tem certeza que deseja excluir este documento?")) return;

    // Tenta deletar do banco
    const { error } = await supabase.from('patient_documents').delete().eq('id', id);
    
    // (Opcional) Poderia deletar do Storage também, mas as vezes mantemos por segurança
    
    if (!error) {
      toast({ title: "Documento removido" });
      fetchDocuments();
    }
  };

  return (
    <div className="space-y-6">
      {/* ÁREA DE UPLOAD */}
      <Card className="border-dashed border-2 bg-slate-50 dark:bg-slate-900/20">
        <CardContent className="pt-6 flex flex-col items-center gap-4">
            <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
            />
            
            {selectedFiles.length === 0 ? (
                <div className="text-center space-y-2">
                    <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto">
                        <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Arraste arquivos ou clique para selecionar</p>
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                        Selecionar Documentos
                    </Button>
                </div>
            ) : (
                <div className="w-full space-y-4">
                    <h3 className="font-semibold text-sm">Arquivos Selecionados ({selectedFiles.length})</h3>
                    <div className="grid gap-3">
                        {selectedFiles.map(item => (
                            <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded border">
                                <FileText className="h-8 w-8 text-blue-500 shrink-0" />
                                <div className="flex-1 space-y-1">
                                    <p className="text-xs text-gray-500 truncate">{item.file.name}</p>
                                    <Input 
                                        value={item.description} 
                                        onChange={(e) => updateDescription(item.id, e.target.value)}
                                        placeholder="Descrição (Ex: Nota Fiscal)"
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeSelected(item.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setSelectedFiles([])}>Cancelar</Button>
                        <Button onClick={handleUpload} disabled={uploading}>
                            {uploading ? "Enviando..." : "Salvar Todos"}
                        </Button>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>

      {/* LISTA DE DOCUMENTOS SALVOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map(doc => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 overflow-hidden">
                        <div className="bg-blue-50 p-2 rounded shrink-0">
                            <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate" title={doc.description}>
                                {doc.description || doc.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                                <Download className="h-4 w-4" />
                            </Button>
                        </a>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
};

export default PatientDocuments;
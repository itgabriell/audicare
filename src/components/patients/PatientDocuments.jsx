import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Upload, FileArchive, FileText, Image, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const PatientDocuments = ({ patientId }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const getPublicUrl = (filePath) => {
    const { data } = supabase.storage.from('patient-documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const loadFiles = useCallback(async () => {
    const { data, error } = await supabase.storage.from('patient-documents').list(patientId);
    if (error) {
      toast({ title: "Erro ao listar documentos", description: error.message, variant: "destructive" });
    } else {
      const formattedFiles = data.map(file => ({
        ...file,
        publicUrl: getPublicUrl(`${patientId}/${file.name}`)
      }));
      setFiles(formattedFiles);
    }
  }, [patientId, toast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você precisa selecionar um arquivo para upload.');
      }
      const file = event.target.files[0];
      const filePath = `${patientId}/${file.name}`;
      const { error } = await supabase.storage.from('patient-documents').upload(filePath, file, {
        upsert: true
      });
      if (error) throw error;
      toast({ title: "Sucesso!", description: "Documento enviado." });
      loadFiles();
    } catch (error) {
      toast({ title: "Erro no Upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileName) => {
    const filePath = `${patientId}/${fileName}`;
    const { error } = await supabase.storage.from('patient-documents').remove([filePath]);
    if (error) {
       toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
       toast({ title: "Sucesso!", description: "Documento removido." });
       loadFiles();
    }
  }

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <Image className="h-5 w-5 text-primary" />;
    }
    return <FileText className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Documentos</h3>
        <Button asChild size="sm">
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Enviando..." : "Fazer Upload"}
            <input id="file-upload" type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </Button>
      </div>
      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map(file => (
            <div key={file.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
              <div className="flex items-center gap-3">
                {getFileIcon(file.name)}
                <a href={file.publicUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">{file.name}</a>
              </div>
              <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" asChild>
                    <a href={file.publicUrl} download>
                        <Download className="h-4 w-4"/>
                    </a>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o documento.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(file.name)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileArchive className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum documento armazenado</p>
          <p className="text-sm text-muted-foreground mt-1">Faça upload de notas, exames e garantias.</p>
        </div>
      )}
    </div>
  );
};

export default PatientDocuments;
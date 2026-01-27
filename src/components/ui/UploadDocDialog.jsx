import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UploadCloud } from 'lucide-react';
import { knowledgeBaseService } from '@/services/knowledgeBaseService';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CATEGORIES = ['Atendimento', 'Protocolos Clínicos', 'Sistema', 'Financeiro', 'Outros'];

export default function UploadDocDialog({ isOpen, onClose, onSuccess }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Atendimento'
  });

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file || !formData.title) return;

    setLoading(true);
    try {
      await knowledgeBaseService.uploadDocument({
        ...formData,
        file,
        userId: session?.user?.id
      });

      toast({ title: 'Documento salvo!', description: 'O arquivo já está disponível.' });
      onSuccess();
      setFile(null);
      setFormData({ title: '', description: '', category: 'Atendimento' });
      onClose();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Falha ao salvar documento.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 text-foreground">
        <DialogHeader>
          <DialogTitle>Novo Documento</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Título do Documento</Label>
            <Input 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Ex: Protocolo de Triagem"
            />
          </div>

          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Select 
              value={formData.category} 
              onValueChange={(val) => setFormData({...formData, category: val})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Descrição (Opcional)</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Breve resumo sobre o conteúdo..."
            />
          </div>

          <div className="grid gap-2">
            <Label>Arquivo</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative">
              <input 
                type="file" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx,.jpg,.png,.jpeg"
              />
              <UploadCloud className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500 text-center">
                {file ? file.name : "Clique ou arraste para enviar (PDF, Imagem, Doc)"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !file || !formData.title}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
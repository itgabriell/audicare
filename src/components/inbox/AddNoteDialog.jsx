import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { StickyNote } from 'lucide-react';

const AddNoteDialog = ({ open, onOpenChange, patientId, onNoteAdded }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!note.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'A nota não pode estar vazia.' });
      return;
    }

    try {
      setLoading(true);
      
      // Buscar notas existentes
      const { data: patientData } = await supabase
        .from('patients')
        .select('notes')
        .eq('id', patientId)
        .single();

      const existingNotes = patientData?.notes || '';
      const timestamp = new Date().toLocaleString('pt-BR');
      const newNoteEntry = `[${timestamp}] ${note.trim()}\n`;
      const updatedNotes = existingNotes ? `${existingNotes}\n\n${newNoteEntry}` : newNoteEntry;

      const { error } = await supabase
        .from('patients')
        .update({ notes: updatedNotes })
        .eq('id', patientId);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Nota adicionada com sucesso.' });
      setNote('');
      onOpenChange(false);
      onNoteAdded?.();
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar nota.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Adicionar Nota
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note">Nota sobre o paciente</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Digite uma nota curta sobre o paciente..."
              className="min-h-[120px]"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Esta nota ficará visível durante o atendimento e será salva no cadastro do paciente.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setNote(''); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !note.trim()}>
            {loading ? 'Salvando...' : 'Salvar Nota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddNoteDialog;


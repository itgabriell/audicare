import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';

const LeadDialog = ({ open, onOpenChange, lead, onSave, onDelete }) => {
  const { register, handleSubmit, control, reset } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      status: 'new',
      source: 'whatsapp',
      notes: ''
    }
  });

  useEffect(() => {
    if (lead) {
      reset(lead);
    } else {
      reset({
        name: '',
        phone: '',
        status: 'new',
        source: 'whatsapp',
        notes: ''
      });
    }
  }, [lead, reset, open]);

  const onSubmit = (data) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...register('name', { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...register('phone', { required: true })} placeholder="55..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Novo Lead</SelectItem>
                      <SelectItem value="in_conversation">Em Conversa</SelectItem>
                      <SelectItem value="scheduled">Agendou</SelectItem>
                      <SelectItem value="likely_purchase">Provável Compra</SelectItem>
                      <SelectItem value="purchased">Venda Realizada</SelectItem>
                      <SelectItem value="no_purchase">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Origem</Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="site">Site/Google</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="indicação">Indicação</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anotações</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between">
             {lead?.id ? (
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => onDelete(lead.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </Button>
             ) : <div></div>}
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDialog;
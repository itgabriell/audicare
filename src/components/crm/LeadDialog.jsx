import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getTeamMembers } from '@/database';

const LeadDialog = ({ open, onOpenChange, onSave, lead }) => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
    channel: 'whatsapp',
    status: 'new',
    owner_id: user?.id || '',
    estimated_value: '',
    probability: 50,
    next_action_date: '',
    next_action_type: '',
    notes: '',
    tags: []
  });

  useEffect(() => {
    if (open) {
      loadTeamMembers();
      if (lead) {
        const leadTags = Array.isArray(lead.tags) ? lead.tags : (lead.tags ? JSON.parse(lead.tags) : []);
        setFormData({
          name: lead.name || '',
          phone: lead.phone || '',
          email: lead.email || '',
          source: lead.source || '',
          channel: lead.channel || 'whatsapp',
          status: lead.status || 'new',
          owner_id: lead.owner_id || user?.id || '',
          estimated_value: lead.estimated_value || '',
          probability: lead.probability || 50,
          next_action_date: lead.next_action_date ? new Date(lead.next_action_date).toISOString().slice(0, 16) : '',
          next_action_type: lead.next_action_type || '',
          notes: lead.notes || '',
          tags: leadTags
        });
        setTags(leadTags);
      } else {
        setFormData({
          name: '',
          phone: '',
          email: '',
          source: '',
          channel: 'whatsapp',
          status: 'new',
          owner_id: user?.id || '',
          estimated_value: '',
          probability: 50,
          next_action_date: '',
          next_action_type: '',
          notes: '',
          tags: []
        });
        setTags([]);
      }
    }
  }, [open, lead, user]);

  const loadTeamMembers = async () => {
    try {
      const members = await getTeamMembers();
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setFormData({ ...formData, tags: newTags });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    setFormData({ ...formData, tags: newTags });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      probability: formData.probability || 0,
      tags: tags.length > 0 ? JSON.stringify(tags) : JSON.stringify([]),
      next_action_date: formData.next_action_date || null
    };
    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Informações Básicas</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Nome do lead"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Origem do Lead</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Ex: Indicação, Google, Redes Sociais"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Canal</Label>
                <Select value={formData.channel} onValueChange={(val) => setFormData({ ...formData, channel: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="contact">Em Contato</SelectItem>
                    <SelectItem value="likely_purchase">Provável Compra</SelectItem>
                    <SelectItem value="purchased">Comprou</SelectItem>
                    <SelectItem value="no_purchase">Não Comprou</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_id">Responsável</Label>
                <Select value={formData.owner_id} onValueChange={(val) => setFormData({ ...formData, owner_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Oportunidade */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Oportunidade</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_value">Valor Estimado (R$)</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Probabilidade de Fechamento: {formData.probability}%</Label>
                <Slider
                  value={[formData.probability]}
                  onValueChange={(val) => setFormData({ ...formData, probability: val[0] })}
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="next_action_date">Próxima Ação - Data</Label>
                <Input
                  id="next_action_date"
                  type="datetime-local"
                  value={formData.next_action_date}
                  onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_action_type">Tipo de Ação</Label>
                <Select value={formData.next_action_type} onValueChange={(val) => setFormData({ ...formData, next_action_type: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="quote">Enviar Orçamento</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Digite uma tag e pressione Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Adicionar
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="min-h-[100px]"
              placeholder="Anotações sobre o lead..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{lead ? 'Salvar Alterações' : 'Criar Lead'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDialog;
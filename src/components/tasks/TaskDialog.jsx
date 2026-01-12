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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getTeamMembers } from '@/database';

const TaskDialog = ({ open, onOpenChange, onSave, task }) => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistInput, setChecklistInput] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee_id: '',
    due_date: '',
    start_date: '',
    priority: 'medium',
    category: '',
    estimated_time: '',
    tags: []
  });

  useEffect(() => {
    if (open) {
      loadTeamMembers();
      if (task) {
        const taskTags = Array.isArray(task.tags) ? task.tags : (task.tags ? JSON.parse(task.tags) : []);
        setFormData({
          title: task.title || '',
          description: task.description || '',
          assignee_id: task.assignee_id || '',
          due_date: task.due_date || '',
          start_date: task.start_date || '',
          priority: task.priority || 'medium',
          category: task.category || '',
          estimated_time: task.estimated_time || '',
          tags: taskTags
        });
        setTags(taskTags);
        // TODO: Carregar checklist items do banco quando implementado
        setChecklistItems([]);
      } else {
        setFormData({
          title: '',
          description: '',
          assignee_id: user?.id || '',
          due_date: '',
          start_date: '',
          priority: 'medium',
          category: '',
          estimated_time: '',
          tags: []
        });
        setTags([]);
        setChecklistItems([]);
      }
    }
  }, [task, open, user]);

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

  const handleAddChecklistItem = () => {
    if (checklistInput.trim()) {
      setChecklistItems([...checklistItems, { id: Date.now(), text: checklistInput.trim(), completed: false }]);
      setChecklistInput('');
    }
  };

  const handleRemoveChecklistItem = (id) => {
    setChecklistItems(checklistItems.filter(item => item.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null,
      tags: tags.length > 0 ? JSON.stringify(tags) : JSON.stringify([]),
      // TODO: Incluir checklist items quando implementar backend
    };
    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Informações Básicas</h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="Título da tarefa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="min-h-[100px]"
                placeholder="Descreva a tarefa em detalhes..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="Ex: Desenvolvimento, Marketing, Suporte"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Responsável e Prazos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Responsabilidade e Prazos</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignee">Responsável</Label>
                <Select value={formData.assignee_id} onValueChange={(val) => setFormData({ ...formData, assignee_id: val })}>
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

              <div className="space-y-2">
                <Label htmlFor="estimated_time">Tempo Estimado (minutos)</Label>
                <Input
                  id="estimated_time"
                  type="number"
                  min="0"
                  value={formData.estimated_time}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_time: e.target.value })
                  }
                  placeholder="Ex: 120"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Início</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Prazo Final</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label>Checklist</Label>
            <div className="flex gap-2">
              <Input
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Adicionar item ao checklist"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddChecklistItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <div className="space-y-2 mt-2 border rounded-lg p-3 bg-muted/30">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => {
                        setChecklistItems(checklistItems.map(i =>
                          i.id === item.id ? { ...i, completed: e.target.checked } : i
                        ));
                      }}
                      className="h-4 w-4"
                    />
                    <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {task ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDialog;
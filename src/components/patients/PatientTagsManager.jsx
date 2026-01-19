import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { X, Plus, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getTags, addTag, getPatientTags, addPatientTag, removePatientTag } from '@/database';

const PatientTagsManager = ({ patientId, patientTags = [], onTagsChange }) => {
  const { toast } = useToast();
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddTagDialog, setShowAddTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  // Cores disponíveis para tags
  const tagColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#F97316', // Orange
  ];

  useEffect(() => {
    if (patientId) {
      loadPatientTags();
    }
    loadAvailableTags();
  }, [patientId]);

  const loadPatientTags = async () => {
    try {
      const tags = await getPatientTags(patientId);
      const formattedTags = tags.map(item => item.tags).filter(Boolean);
      setSelectedTags(formattedTags);
      if (onTagsChange) {
        onTagsChange(formattedTags);
      }
    } catch (error) {
      console.error('Error loading patient tags:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as tags do paciente.'
      });
    }
  };

  const loadAvailableTags = async () => {
    try {
      const { data } = await getTags(1, 100); // Carregar até 100 tags disponíveis
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error loading available tags:', error);
    }
  };

  const handleAddTag = async (tagId) => {
    if (!patientId) return;

    try {
      setLoading(true);
      await addPatientTag(patientId, tagId);

      // Atualizar lista local
      const tag = availableTags.find(t => t.id === tagId);
      if (tag) {
        const newSelectedTags = [...selectedTags, tag];
        setSelectedTags(newSelectedTags);
        if (onTagsChange) {
          onTagsChange(newSelectedTags);
        }
      }

      toast({
        title: 'Tag adicionada',
        description: 'A tag foi associada ao paciente com sucesso.'
      });
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível adicionar a tag.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    if (!patientId) return;

    try {
      setLoading(true);
      await removePatientTag(patientId, tagId);

      // Atualizar lista local
      const newSelectedTags = selectedTags.filter(tag => tag.id !== tagId);
      setSelectedTags(newSelectedTags);
      if (onTagsChange) {
        onTagsChange(newSelectedTags);
      }

      toast({
        title: 'Tag removida',
        description: 'A tag foi removida do paciente.'
      });
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover a tag.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome da tag é obrigatório.'
      });
      return;
    }

    try {
      setLoading(true);
      const newTag = await addTag({
        name: newTagName.trim(),
        color: newTagColor,
        description: ''
      });

      // Adicionar à lista de disponíveis e selecionar
      setAvailableTags([...availableTags, newTag]);
      await handleAddTag(newTag.id);

      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowAddTagDialog(false);
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível criar a tag.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTagsToAdd = () => {
    const selectedTagIds = selectedTags.map(tag => tag.id);
    return availableTags.filter(tag => !selectedTagIds.includes(tag.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tags do Paciente</Label>
        <div className="flex gap-2">
          {getAvailableTagsToAdd().length > 0 && (
            <Select onValueChange={handleAddTag} disabled={loading}>
              <SelectTrigger className="w-[180px]">
                <Plus className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Adicionar tag" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableTagsToAdd().map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddTagDialog(true)}
            disabled={loading}
          >
            <Tag className="h-4 w-4 mr-2" />
            Nova Tag
          </Button>
        </div>
      </div>

      {/* Tags selecionadas */}
      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
              style={{
                backgroundColor: `${tag.color}20`,
                borderColor: tag.color,
                color: tag.color
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => handleRemoveTag(tag.id)}
                disabled={loading}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma tag associada a este paciente.
        </p>
      )}

      {/* Dialog para criar nova tag */}
      <Dialog open={showAddTagDialog} onOpenChange={setShowAddTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Tag</DialogTitle>
            <DialogDescription>
              Crie uma nova tag para categorizar seus pacientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome da Tag *</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ex: VIP, Recorrente, Alergia"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor da Tag</Label>
              <div className="flex gap-2 flex-wrap">
                {tagColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      newTagColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddTagDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateNewTag}
              disabled={loading || !newTagName.trim()}
            >
              {loading ? 'Criando...' : 'Criar Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientTagsManager;

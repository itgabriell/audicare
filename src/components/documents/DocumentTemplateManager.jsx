import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Edit, Trash2, FileText, Eye } from 'lucide-react';
import { documentService } from '@/services/documentService';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const DocumentTemplateManager = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    watermark_enabled: true,
    watermark_text: 'DOCUMENTO MÉDICO',
    signature_enabled: true,
    signature_position: 'bottom-right',
    template_content: {
      html: '',
      fields: [],
    },
    is_active: true,
  });

  useEffect(() => {
    if (profile?.clinic_id) {
      loadTemplates();
    }
  }, [profile]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await documentService.getTemplates(profile.clinic_id);
      setTemplates(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar templates',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        type: template.type,
        description: template.description || '',
        watermark_enabled: template.watermark_enabled ?? true,
        watermark_text: template.watermark_text || 'DOCUMENTO MÉDICO',
        signature_enabled: template.signature_enabled ?? true,
        signature_position: template.signature_position || 'bottom-right',
        template_content: template.template_content || { html: '', fields: [] },
        is_active: template.is_active ?? true,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        type: '',
        description: '',
        watermark_enabled: true,
        watermark_text: 'DOCUMENTO MÉDICO',
        signature_enabled: true,
        signature_position: 'bottom-right',
        template_content: { html: '', fields: [] },
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.type) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios.',
        });
        return;
      }

      const templateData = {
        ...formData,
        clinic_id: profile.clinic_id,
        id: editingTemplate?.id,
      };

      await documentService.saveTemplate(templateData);

      toast({
        title: 'Template salvo',
        description: 'O template foi salvo com sucesso.',
        className: 'bg-green-100 border-green-500',
      });

      setDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar o template.',
      });
    }
  };

  const addField = () => {
    setFormData(prev => ({
      ...prev,
      template_content: {
        ...prev.template_content,
        fields: [
          ...(prev.template_content.fields || []),
          {
            name: `field_${Date.now()}`,
            label: 'Novo Campo',
            type: 'text',
            placeholder: '',
            patientField: '',
          },
        ],
      },
    }));
  };

  const updateField = (index, fieldData) => {
    setFormData(prev => {
      const fields = [...(prev.template_content.fields || [])];
      fields[index] = { ...fields[index], ...fieldData };
      return {
        ...prev,
        template_content: {
          ...prev.template_content,
          fields,
        },
      };
    });
  };

  const removeField = (index) => {
    setFormData(prev => {
      const fields = [...(prev.template_content.fields || [])];
      fields.splice(index, 1);
      return {
        ...prev,
        template_content: {
          ...prev.template_content,
          fields,
        },
      };
    });
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates de Documentos</h2>
          <p className="text-muted-foreground">
            Gerencie os templates de documentos que podem ser gerados durante as consultas.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {template.name}
              </CardTitle>
              <CardDescription>{template.description || template.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(template)}
                  title="Visualizar"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                  {template.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Template *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Receita Médica"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prescription">Receita</SelectItem>
                    <SelectItem value="medical_certificate">Atestado</SelectItem>
                    <SelectItem value="report">Relatório</SelectItem>
                    <SelectItem value="invoice">Nota Fiscal</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do template..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Marca d'água</Label>
                <Switch
                  checked={formData.watermark_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, watermark_enabled: checked })
                  }
                />
              </div>
              {formData.watermark_enabled && (
                <div className="space-y-2">
                  <Label>Texto da Marca d'água</Label>
                  <Input
                    value={formData.watermark_text}
                    onChange={(e) =>
                      setFormData({ ...formData, watermark_text: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Assinatura</Label>
                <Switch
                  checked={formData.signature_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, signature_enabled: checked })
                  }
                />
              </div>
              {formData.signature_enabled && (
                <div className="space-y-2">
                  <Label>Posição da Assinatura</Label>
                  <Select
                    value={formData.signature_position}
                    onValueChange={(value) =>
                      setFormData({ ...formData, signature_position: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                      <SelectItem value="bottom-center">Inferior Centro</SelectItem>
                      <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Campos do Template */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Campos do Documento</Label>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Campo
                </Button>
              </div>

              {formData.template_content.fields?.map((field, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Campo</Label>
                      <Input
                        value={field.name}
                        onChange={(e) =>
                          updateField(index, { name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rótulo</Label>
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          updateField(index, { label: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={field.type}
                        onValueChange={(value) => updateField(index, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="textarea">Área de Texto</SelectItem>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                          <SelectItem value="select">Seleção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Campo do Paciente (auto-preenchimento)</Label>
                      <Input
                        value={field.patientField || ''}
                        onChange={(e) =>
                          updateField(index, { patientField: e.target.value })
                        }
                        placeholder="Ex: name, cpf, birth_date"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={() => removeField(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualização do Template: {previewTemplate?.name}</DialogTitle>
            <CardDescription>Esta é uma simulação visual de como o documento será gerado.</CardDescription>
          </DialogHeader>

          <div className="border p-8 min-h-[500px] bg-white text-black shadow-sm relative">
            {/* Simulação de Cabeçalho (se houver lógica para isso no futuro, aqui é estático por enquanto) */}
            <div className="text-center mb-8 border-b pb-4">
              <h1 className="text-xl font-bold uppercase">{previewTemplate?.name}</h1>
              <p className="text-sm text-gray-500">Clínica Audicare</p>
            </div>

            {/* Conteúdo do Template (Fields) */}
            <div className="space-y-6">
              {previewTemplate?.template_content?.fields?.map((field, idx) => (
                <div key={idx} className="mb-4">
                  <p className="font-semibold text-sm mb-1">{field.label}:</p>
                  <div className="p-2 bg-gray-50 border border-dashed border-gray-300 rounded text-gray-500 italic text-sm">
                    {'{'}{'{'} {field.label} {'}'}{'}'}
                  </div>
                </div>
              ))}
              {(!previewTemplate?.template_content?.fields || previewTemplate.template_content.fields.length === 0) && (
                <p className="text-center text-gray-400 italic py-10">Este template não possui campos definidos.</p>
              )}
            </div>

            {/* Marca d'água */}
            {previewTemplate?.watermark_enabled && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] select-none">
                <span className="transform -rotate-45 text-6xl font-black uppercase">
                  {previewTemplate.watermark_text}
                </span>
              </div>
            )}

            {/* Assinatura */}
            {previewTemplate?.signature_enabled && (
              <div className={`absolute bottom-8 w-64 border-t border-black pt-2 text-center text-sm
                    ${previewTemplate.signature_position === 'bottom-left' ? 'left-8' :
                  previewTemplate.signature_position === 'bottom-center' ? 'left-1/2 -translate-x-1/2' :
                    'right-8'}`
              }>
                <p className="font-bold">Dr(a). Nome do Profissional</p>
                <p className="text-xs">CRFa: 12345</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentTemplateManager;


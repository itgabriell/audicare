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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Instagram, Facebook, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getTeamMembers } from '@/database';

const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
];

const STATUS_OPTIONS = [
  { value: 'idea', label: '💡 Ideia' },
  { value: 'scripting', label: '📝 Roteiro' },
  { value: 'to_record', label: '🎬 Gravação' },
  { value: 'editing', label: '✂️ Edição' },
  { value: 'ready', label: '✅ Pronto' },
  { value: 'scheduled', label: '📅 Agendado' },
  { value: 'published', label: '🚀 Publicado' },
];

const MEDIA_TYPE_OPTIONS = [
  { value: 'image', label: 'Imagem' },
  { value: 'video', label: 'Vídeo' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Stories' },
];

const SocialPostDialog = ({ open, onOpenChange, onSave, post, campaigns = [] }) => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    channels: [],
    media_type: 'none',
    status: 'idea',
    scheduled_date: '',
    campaign_id: 'none',
    assignee_id: 'none',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      loadTeamMembers();
      if (post) {
        // channels pode vir como array ou como string JSON do banco
        let channels = [];
        if (Array.isArray(post.channels)) {
          channels = post.channels;
        } else if (typeof post.channels === 'string' && post.channels) {
          try {
            channels = JSON.parse(post.channels);
          } catch {
            // Se não for JSON válido, tenta como string simples
            channels = post.channels ? [post.channels] : [];
          }
        }

        setFormData({
          title: post.title || '',
          content: post.content || '',
          channels: channels,
          media_type: post.media_type || 'none',
          status: post.status || 'idea',
          scheduled_date: post.scheduled_date
            ? new Date(post.scheduled_date).toISOString().slice(0, 16)
            : '',
          campaign_id: post.campaign_id || 'none',
          assignee_id: post.assignee_id || user?.id || 'none',
          notes: post.notes || '',
        });
      } else {
        setFormData({
          title: '',
          content: '',
          channels: [],
          media_type: 'none',
          status: 'idea',
          scheduled_date: '',
          campaign_id: 'none',
          assignee_id: user?.id || 'none',
          notes: '',
        });
      }
    }
  }, [post, open, campaigns, user]);

  const loadTeamMembers = async () => {
    try {
      const members = await getTeamMembers();
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
    }
  };

  const handleChannelToggle = (channel) => {
    setFormData(prev => {
      const channels = prev.channels || [];
      if (channels.includes(channel)) {
        return { ...prev, channels: channels.filter(c => c !== channel) };
      } else {
        return { ...prev, channels: [...channels, channel] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const channelsArray = Array.isArray(formData.channels) ? formData.channels : [];
    // Preenche a coluna 'channel' (singular) com o primeiro canal ou 'whatsapp' como padrão
    const channelValue = channelsArray.length > 0 ? channelsArray[0] : 'whatsapp';

    const submitData = {
      ...formData,
      channels: channelsArray,
      channel: channelValue, // Coluna singular obrigatória do banco
      scheduled_date: formData.scheduled_date
        ? new Date(formData.scheduled_date).toISOString()
        : null,
      campaign_id: formData.campaign_id === 'none' || !formData.campaign_id ? null : formData.campaign_id,
      assignee_id: formData.assignee_id === 'none' || !formData.assignee_id ? null : formData.assignee_id,
      media_type: formData.media_type === 'none' || !formData.media_type ? null : formData.media_type,
    };
    onSave(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle>
            {post ? 'Editar Post' : 'Novo Post para Redes Sociais'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Informações Básicas</h3>

            <div className="space-y-2">
              <Label htmlFor="title">Título do Post *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="Ex: Campanha Outubro Rosa - Feed Principal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign_id">Campanha</Label>
                <Select
                  value={formData.campaign_id}
                  onValueChange={(val) => setFormData({ ...formData, campaign_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma campanha</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Canais e Tipo de Mídia */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Canais e Mídia</h3>

            <div className="space-y-2">
              <Label>Canais de Publicação *</Label>
              <div className="flex flex-wrap gap-3">
                {CHANNEL_OPTIONS.map((channel) => {
                  const Icon = channel.icon;
                  const isSelected = formData.channels.includes(channel.value);
                  return (
                    <div
                      key={channel.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`channel-${channel.value}`}
                        checked={isSelected}
                        onCheckedChange={() => handleChannelToggle(channel.value)}
                      />
                      <Label
                        htmlFor={`channel-${channel.value}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Icon className="h-4 w-4" />
                        {channel.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="media_type">Tipo de Mídia</Label>
              <Select
                value={formData.media_type}
                onValueChange={(val) => setFormData({ ...formData, media_type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não especificado</SelectItem>
                  {MEDIA_TYPE_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Conteúdo</h3>

            <div className="space-y-2">
              <Label htmlFor="content">Legenda / Roteiro</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Escreva a legenda, roteiro ou descrição do post..."
                className="min-h-[120px]"
              />
            </div>
          </div>

          {/* Agendamento e Responsável */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Agendamento e Responsável</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Data e Hora de Publicação</Label>
                <Input
                  id="scheduled_date"
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee_id">Responsável</Label>
                <Select
                  value={formData.assignee_id}
                  onValueChange={(val) => setFormData({ ...formData, assignee_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
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

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Internas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Observações sobre arte, aprovação, referências..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={formData.channels.length === 0}>
              {post ? 'Salvar Alterações' : 'Criar Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SocialPostDialog;


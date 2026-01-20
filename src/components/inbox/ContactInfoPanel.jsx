import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Phone, Mail, User, Calendar, StickyNote, 
  MessageCircle, Instagram, Facebook, MoreHorizontal 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { addPatient, getClinicId } from '@/database';
import { formatPhoneE164 } from '@/lib/phoneUtils';
import PatientFullDetailsModal from './PatientFullDetailsModal';
import AddNoteDialog from './AddNoteDialog';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';

const ChannelIcon = ({ channel }) => {
  switch (channel) {
    case 'whatsapp': return <MessageCircle className="h-3.5 w-3.5 text-green-600" />;
    case 'instagram': return <Instagram className="h-3.5 w-3.5 text-pink-600" />;
    case 'facebook': return <Facebook className="h-3.5 w-3.5 text-blue-600" />;
    case 'email': return <Mail className="h-3.5 w-3.5 text-orange-600" />;
    default: return <MessageCircle className="h-3.5 w-3.5 text-gray-500" />;
  }
};

const ContactInfoPanel = ({ conversation, contact }) => {
  const { toast } = useToast();
  const [isImgOpen, setIsImgOpen] = useState(false);
  const [patient, setPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({ name: '', phone: '', cpf: '', email: '' });
  const [allTags, setAllTags] = useState([]);
  const [patientTags, setPatientTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [stages, setStages] = useState([]);
  const [deal, setDeal] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  
  const displayName = contact?.name || conversation?.contact_name || 'Desconhecido';
  const displayPhone = contact?.phone || conversation?.contact_phone;
  const channel = contact?.channel || 'whatsapp';

  if (!contact) return null;

  const phoneE164 = useMemo(() => {
    const raw = contact?.phone || conversation?.contact_phone || contact?.mobile_phone;
    return formatPhoneE164(raw);
  }, [contact?.phone, conversation?.contact_phone, contact?.mobile_phone]);

  const syncFields = useCallback((p) => {
    if (!p) {
      // Se não há paciente, preencher com dados do contato/conversa
      setFields({
        name: displayName || '',
        phone: phoneE164 || displayPhone || '',
        cpf: '',
        email: ''
      });
      return;
    }
    setFields({
      name: p.name || displayName || '',
      phone: p.phone || phoneE164 || displayPhone || '',
      cpf: p.cpf || '',
      email: p.email || ''
    });
  }, [displayName, phoneE164, displayPhone]);

  const fetchPatient = useCallback(async () => {
    if (!phoneE164 && !contact?.patient_id) return;
    setLoadingPatient(true);
    try {
      let found = null;
      if (contact?.patient_id) {
        const { data } = await supabase.from('patients').select('*').eq('id', contact.patient_id).single();
        found = data;
      }
      if (!found && phoneE164) {
        const { data } = await supabase
          .rpc('find_patient_by_phone', {
            phone_number: phoneE164
          })
          .maybeSingle();
        found = data;
      }
      if (!found && phoneE164) {
        const { data } = await supabase.rpc('upsert_patient_by_phone', { p_phone: phoneE164, p_name: displayName });
        if (data) {
          const { data: fetched } = await supabase.from('patients').select('*').eq('id', data).single();
          found = fetched;
        }
      }
      if (found) {
        setPatient(found);
        syncFields(found);
      }
    } catch (err) {
      console.error('fetchPatient', err);
    } finally {
      setLoadingPatient(false);
    }
  }, [contact?.patient_id, displayName, phoneE164, syncFields]);

  const fetchTags = useCallback(async (patientId) => {
    if (!patientId) return;
    const { data: tagsData } = await supabase.from('tags').select('*').order('name');
    setAllTags(tagsData || []);

    const { data: ptags } = await supabase
      .from('patient_tags')
      .select('id, tag:tags(*)')
      .eq('patient_id', patientId);
    setPatientTags(ptags || []);
  }, []);

  const fetchCRM = useCallback(async (patientId) => {
    if (!patientId) return;
    const { data: stagesData } = await supabase.from('crm_stages').select('*').order('order', { ascending: true });
    setStages(stagesData || []);

    const { data: dealData } = await supabase
      .from('crm_deals')
      .select('id, title, stage_id, stage:crm_stages(id, name)')
      .eq('patient_id', patientId)
      .limit(1)
      .maybeSingle();
    setDeal(dealData || null);
  }, []);

  useEffect(() => {
    // Preencher campos inicialmente com dados do contato
    if (!patient && (phoneE164 || displayPhone)) {
      syncFields(null);
    }
    fetchPatient();
  }, [fetchPatient, phoneE164, displayPhone, syncFields, patient]);

  useEffect(() => {
    if (patient?.id) {
      fetchTags(patient.id);
      fetchCRM(patient.id);
    }
  }, [patient?.id, fetchTags, fetchCRM]);

  const handleSave = async () => {
    const phoneNormalized = formatPhoneE164(fields.phone || phoneE164);
    
    // Validação mínima
    if (!fields.name?.trim() && !displayName) {
      toast({ title: 'Nome obrigatório', description: 'Informe o nome do paciente.', variant: 'destructive' });
      return;
    }
    
    if (!phoneNormalized) {
      toast({ title: 'Telefone obrigatório', description: 'Informe um telefone válido para criar o paciente.', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      let savedPatient = null;
      
      if (patient?.id) {
        // Atualizar paciente existente
        // Incluir avatar_url do contato se disponível e paciente não tiver
        const updateData = {
          name: fields.name || displayName,
          cpf: fields.cpf || null,
          email: fields.email || null,
          phone: phoneNormalized
        };
        
        // Atualizar avatar se o contato tiver e o paciente não tiver
        if (contact?.avatar_url && !patient.avatar_url) {
          updateData.avatar_url = contact.avatar_url;
        }
        
        const { data, error } = await supabase
          .from('patients')
          .update(updateData)
          .eq('id', patient.id)
          .select()
          .single();
        if (error) throw error;
        savedPatient = data;
      } else {
        // Criar novo paciente - usar função addPatient que já lida com RLS
        const clinicId = await getClinicId();
        if (!clinicId) {
          throw new Error('Clínica não identificada. Faça login novamente.');
        }
        
        // Verificar se já existe paciente com este telefone na mesma clínica
        const { data: existingPatient } = await supabase
      .from('patients')
      .select('id, name, cpf, email')
      .eq('clinic_id', clinicId)
      .eq('phone', phoneNormalized)
      .maybeSingle();
        
        if (existingPatient) {
          // Atualizar paciente existente
          const { data, error } = await supabase
            .from('patients')
            .update({
              name: fields.name || displayName || existingPatient.name,
              cpf: fields.cpf || existingPatient.cpf || null,
              email: fields.email || existingPatient.email || null,
              phone: phoneNormalized
            })
            .eq('id', existingPatient.id)
            .select()
            .single();
          if (error) throw error;
          savedPatient = data;
        } else {
          // Criar novo paciente usando addPatient que já lida com clinic_id e RLS
          try {
            savedPatient = await addPatient({
              name: fields.name || displayName,
              phone: phoneNormalized,
              cpf: fields.cpf || null,
              email: fields.email || null
              // avatar_url removido pois a coluna não existe na tabela patients
            });
          } catch (addError) {
            // Se falhar por duplicata, tentar buscar o paciente existente
            if (addError.code === '23505' || addError.message?.includes('duplicate')) {
              const { data: existing } = await supabase
                .from('patients')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('phone', phoneNormalized)
                .single();
              if (existing) {
                savedPatient = existing;
                // Atualizar avatar se o contato tiver e o paciente não tiver
                if (contact?.avatar_url && !existing.avatar_url) {
                  await supabase
                    .from('patients')
                    .update({ avatar_url: contact.avatar_url })
                    .eq('id', existing.id);
                  savedPatient = { ...existing, avatar_url: contact.avatar_url };
                }
              } else {
                throw addError;
              }
            } else {
              throw addError;
            }
          }
        }
      }
      
      if (savedPatient) {
        setPatient(savedPatient);
        syncFields(savedPatient);
        
        // Vincular ao contato
        if (phoneNormalized && contact?.id) {
          await supabase
            .from('contacts')
            .update({ patient_id: savedPatient.id, phone: phoneNormalized })
            .eq('id', contact.id);
        }
        
        toast({ 
          title: patient?.id ? 'Dados atualizados' : 'Paciente criado', 
          description: `Paciente ${savedPatient.name} ${patient?.id ? 'atualizado' : 'criado'} com sucesso.` 
        });
      }
    } catch (err) {
      console.error('handleSave', err);
      let errorMsg = err.message || 'Não foi possível salvar o paciente.';
      
      if (err.code === 'PGRST204' || err.message?.includes('column') || err.message?.includes('schema')) {
          errorMsg = 'Erro interno: Coluna não existe no banco de dados. Contate o suporte.';
      }

      toast({ 
        title: 'Erro ao salvar', 
        description: errorMsg, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrLink = async () => {
    const phoneNormalized = formatPhoneE164(fields.phone || phoneE164);
    if (!phoneNormalized) {
      toast({ title: 'Telefone inválido', description: 'Informe um telefone para criar o paciente.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: patientId } = await supabase.rpc('upsert_patient_by_phone', {
        p_phone: phoneNormalized,
        p_name: fields.name || displayName,
        p_email: fields.email,
        p_cpf: fields.cpf
      });
      if (patientId) {
        const { data } = await supabase.from('patients').select('*').eq('id', patientId).single();
        setPatient(data);
        syncFields(data);
        await supabase.from('contacts').update({ patient_id: patientId, phone: phoneNormalized }).eq('id', contact.id);
        toast({ title: 'Paciente vinculado' });
      }
    } catch (err) {
      console.error('handleCreateOrLink', err);
      toast({ title: 'Erro ao vincular', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!patient?.id || !tagInput.trim()) return;
    const name = tagInput.trim();
    let tag = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
    try {
      if (!tag) {
        const { data, error } = await supabase.from('tags').insert({ name }).select().single();
        if (error) throw error;
        tag = data;
        setAllTags(prev => [...prev, data]);
      }
      await supabase.from('patient_tags').insert({ patient_id: patient.id, tag_id: tag.id });
      setTagInput('');
      fetchTags(patient.id);
    } catch (err) {
      console.error('handleAddTag', err);
      toast({ title: 'Erro ao adicionar tag', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveTag = async (patientTagId) => {
    if (!patientTagId) return;
    await supabase.from('patient_tags').delete().eq('id', patientTagId);
    fetchTags(patient?.id);
  };

  const handleCreateDeal = async () => {
    if (!patient?.id) return;
    const defaultStage = stages?.[0]?.id || null;
    const title = `Atendimento - ${fields.name || displayName}`;
    const { data, error } = await supabase.from('crm_deals').insert({
      patient_id: patient.id,
      stage_id: defaultStage,
      title
    }).select().single();
    if (error) {
      toast({ title: 'Erro ao criar card', description: error.message, variant: 'destructive' });
      return;
    }
    setDeal(data);
    toast({ title: 'Card criado no CRM' });
  };

  const handleMoveStage = async (stageId) => {
    if (!deal?.id) return;
    const { data, error } = await supabase.from('crm_deals').update({ stage_id: stageId }).eq('id', deal.id).select().single();
    if (error) {
      toast({ title: 'Erro ao mover estágio', description: error.message, variant: 'destructive' });
      return;
    }
    setDeal(data);
    toast({ title: 'Movido no CRM' });
  };

  const handleOpenProfile = () => {
    if (!patient?.id) {
      toast({ title: "Paciente não encontrado", description: "Vincule o paciente pelo telefone primeiro.", variant: "destructive" });
      return;
    }
    setShowPatientModal(true);
  };

  const handleScheduleAppointment = () => {
    if (!patient?.id) {
      toast({ title: "Paciente não encontrado", description: "Vincule o paciente pelo telefone primeiro.", variant: "destructive" });
      return;
    }
    setShowAppointmentDialog(true);
  };

  const handleAddNote = () => {
    if (!patient?.id) {
      toast({ title: "Paciente não encontrado", description: "Vincule o paciente pelo telefone primeiro.", variant: "destructive" });
      return;
    }
    setShowNoteDialog(true);
  };

  const handleNoteAdded = async () => {
    await fetchPatient();
  };

  const handleAppointmentSaved = () => {
    toast({ title: "Sucesso", description: "Agendamento criado com sucesso!" });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-900/50">
      {isImgOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsImgOpen(false)}
        >
          <div className="relative max-w-2xl w-full max-h-screen flex flex-col items-center">
            <img 
              src={contact.avatar_url} alt={displayName} 
              className="w-full h-auto rounded-lg shadow-2xl object-contain max-h-[85vh] bg-black"
              onClick={(e) => e.stopPropagation()}
            />
            <Button variant="secondary" size="icon" className="absolute top-2 right-2 rounded-full shadow-md" onClick={() => setIsImgOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
            <p className="text-white mt-4 font-medium text-lg">{displayName}</p>
          </div>
        </div>
      )}

      <div className="p-6 flex flex-col items-center border-b bg-background">
        <div className="relative group cursor-pointer" onClick={() => contact.avatar_url && setIsImgOpen(true)}>
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg transition-transform hover:scale-105">
            <AvatarImage src={contact.avatar_url} className="object-cover" />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">{displayName[0]}</AvatarFallback>
          </Avatar>
          {contact.avatar_url && (
            <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
               <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full">Ampliar</span>
            </div>
          )}
        </div>
        <div className="mt-4 text-center">
          <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
             <Badge variant="secondary" className="gap-1.5 font-normal px-2 py-0.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 shadow-none">
                <ChannelIcon channel={channel} />
                <span className="capitalize text-xs">{channel}</span>
             </Badge>
          </div>
        </div>
        <div className="flex gap-2 mt-6 w-full">
           <Button className="flex-1 gap-2 shadow-sm" variant="default" onClick={handleOpenProfile}>
              <User className="h-4 w-4" /> Ver Cadastro
           </Button>
           <Button className="flex-1 gap-2 shadow-sm" variant="outline" onClick={handleScheduleAppointment}>
              <Calendar className="h-4 w-4" /> Agendar
           </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">Dados do Paciente</h3>
              <div className="flex gap-2">
                {!patient?.id && (
                  <Button size="sm" variant="outline" onClick={handleCreateOrLink} disabled={saving || loadingPatient}>
                    Vincular pelo telefone
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  disabled={saving || loadingPatient}
                  className={!patient?.id ? 'flex-1' : ''}
                >
                  {saving ? 'Salvando...' : patient?.id ? 'Salvar' : 'Criar Paciente'}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[11px] uppercase">Nome</p>
                <Input value={fields.name} onChange={(e) => setFields(f => ({ ...f, name: e.target.value }))} placeholder="Nome do paciente" />
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-[11px] uppercase flex items-center gap-2"><Phone className="h-3 w-3" /> Celular / WhatsApp</p>
                <Input value={fields.phone} onChange={(e) => setFields(f => ({ ...f, phone: e.target.value }))} placeholder="+55 (DD) 9XXXX-XXXX" />
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-[11px] uppercase">CPF</p>
                <Input value={fields.cpf} onChange={(e) => setFields(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-[11px] uppercase"><Mail className="h-3 w-3 inline mr-1" /> Email</p>
                <Input value={fields.email} onChange={(e) => setFields(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
              </div>
            </div>
          </div>
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Nova tag"
                  className="h-8 w-32"
                />
                <Button size="sm" variant="outline" className="h-8" onClick={handleAddTag} disabled={!patient?.id}>Adicionar</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {patientTags.map(pt => (
                <Badge key={pt.id} variant="secondary" className="gap-1">
                  {pt.tag?.name || 'Tag'}
                  <button className="ml-1 text-xs text-muted-foreground" onClick={() => handleRemoveTag(pt.id)}>×</button>
                </Badge>
              ))}
              {patientTags.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma tag aplicada.</p>}
            </div>
          </div>
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CRM</h3>
              {!deal ? (
                <Button size="sm" onClick={handleCreateDeal} disabled={!patient?.id || stages.length === 0}>Criar card</Button>
              ) : null}
            </div>
            {deal ? (
              <div className="space-y-2">
                <p className="text-sm font-medium truncate">{deal.title || 'Card CRM'}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Estágio:</p>
                  <select
                    className="text-sm border rounded-md px-2 py-1 bg-background"
                    value={deal.stage_id || ''}
                    onChange={(e) => handleMoveStage(e.target.value || null)}
                  >
                    <option value="">Sem estágio</option>
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum card no CRM para este paciente.</p>
            )}
          </div>
          <Separator />
          <div className="space-y-3">
             <div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas & Observações</h3><Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-200"><MoreHorizontal className="h-4 w-4"/></Button></div>
             <div className="bg-yellow-50/80 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-3 rounded-lg shadow-sm">
                <div className="flex gap-2 mb-1.5 items-center"><StickyNote className="h-3.5 w-3.5 text-yellow-600" /><span className="text-[10px] font-bold text-yellow-700/80 uppercase">Nota Recente</span><span className="ml-auto text-[10px] text-yellow-600/70">{format(new Date(), "dd MMM", { locale: ptBR })}</span></div>
                <p className="text-sm text-yellow-900/80 dark:text-yellow-200/80 leading-snug">Paciente demonstrou interesse no aparelho modelo X. Agendar retorno em breve.</p>
             </div>
             <Button variant="outline" size="sm" className="w-full text-xs h-8 border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:text-primary hover:border-primary/30" onClick={handleAddNote}>+ Adicionar Nota</Button>
          </div>
          <Separator />
          <div className="space-y-2">
             <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metadados</h3>
             <div className="text-[10px] text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg border">
                <div className="flex justify-between"><span>Criado em:</span><span className="font-medium">{contact.created_at ? format(new Date(contact.created_at), 'dd/MM/yyyy HH:mm') : '-'}</span></div>
                <div className="flex justify-between"><span>ID Sistema:</span><span className="font-mono">{contact.id?.slice(0,8)}...</span></div>
             </div>
          </div>
        </div>
      </ScrollArea>

      {/* Modais */}
      {patient?.id && (
        <>
          <PatientFullDetailsModal
            open={showPatientModal}
            onOpenChange={setShowPatientModal}
            patientId={patient.id}
          />
          <AddNoteDialog
            open={showNoteDialog}
            onOpenChange={setShowNoteDialog}
            patientId={patient.id}
            onNoteAdded={handleNoteAdded}
          />
          <AppointmentDialog
            open={showAppointmentDialog}
            onOpenChange={setShowAppointmentDialog}
            onSuccess={handleAppointmentSaved}
            appointment={null}
            initialData={patient?.id ? { patient_id: patient.id } : null}
          />
        </>
      )}
    </div>
  );
};

export default ContactInfoPanel;

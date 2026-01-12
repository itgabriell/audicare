import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Calendar as CalendarIcon, LayoutGrid, TrendingUp, Target, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SocialPostKanban from '@/components/social-media/SocialPostKanban';
import SocialPostDialog from '@/components/social-media/SocialPostDialog';
import { getCampaigns, getSocialPosts, addSocialPost, updateSocialPost, deleteSocialPost } from '@/database';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';

const SocialMedia = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsData, postsData] = await Promise.all([
        getCampaigns(),
        getSocialPosts(),
      ]);
      setCampaigns(campaignsData || []);
      setPosts(postsData || []);
    } catch (error) {
      console.error('[SocialMedia] Erro ao carregar dados', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error?.message || 'Ocorreu um erro ao buscar campanhas e posts.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();

    // Realtime subscription para posts
    const channel = supabase
      .channel('social_posts_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'social_posts' }, 
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const activeCampaign = useMemo(() => {
    return campaigns.find(c => c.status === 'active') || null;
  }, [campaigns]);

  const handleSavePost = async (formData) => {
    try {
      if (editingPost) {
        await updateSocialPost(editingPost.id, formData);
        toast({
          title: 'Post atualizado',
          description: 'O post foi atualizado com sucesso.',
        });
      } else {
        await addSocialPost(formData);
        toast({
          title: 'Post criado',
          description: 'Novo post adicionado à esteira de produção.',
        });
      }
      setDialogOpen(false);
      setEditingPost(null);
      await loadData();
    } catch (error) {
      console.error('[SocialMedia] Erro ao salvar post', error);
      toast({
        title: 'Erro ao salvar post',
        description: error?.message || 'Não foi possível salvar o post. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePost = async (id) => {
    try {
      await deleteSocialPost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      toast({
        title: 'Post removido',
        description: 'O post foi removido da esteira de produção.',
      });
    } catch (error) {
      console.error('[SocialMedia] Erro ao remover post', error);
      toast({
        title: 'Erro ao remover post',
        description: error?.message || 'Não foi possível remover o post.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (postId, newStatus) => {
    try {
      await updateSocialPost(postId, { status: newStatus });
      await loadData();
    } catch (error) {
      console.error('[SocialMedia] Erro ao atualizar status', error);
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o status do post.',
        variant: 'destructive',
      });
    }
  };

  // Calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const postsByDate = useMemo(() => {
    const map = new Map();
    posts.forEach(post => {
      if (post.scheduled_date) {
        const dateKey = format(new Date(post.scheduled_date), 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey).push(post);
      }
    });
    return map;
  }, [posts]);

  const getPostsForDate = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return postsByDate.get(dateKey) || [];
  };

  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Métricas
  const metrics = useMemo(() => {
    return {
      total: posts.length,
      byStatus: {
        idea: posts.filter(p => p.status === 'idea').length,
        scripting: posts.filter(p => p.status === 'scripting').length,
        to_record: posts.filter(p => p.status === 'to_record').length,
        editing: posts.filter(p => p.status === 'editing').length,
        ready: posts.filter(p => p.status === 'ready').length,
        scheduled: posts.filter(p => p.status === 'scheduled').length,
        published: posts.filter(p => p.status === 'published').length,
      },
      scheduled: posts.filter(p => p.scheduled_date && new Date(p.scheduled_date) >= new Date()).length,
    };
  }, [posts]);

  return (
    <>
      <Helmet>
        <title>Gestão de Social Media - Audicare</title>
        <meta name="description" content="Esteira de produção para posts em redes sociais" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Gestão de Social Media
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Esteira de produção para manter a constância nas postagens
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingPost(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Post
          </Button>
        </div>

        {/* Card de Campanha Ativa */}
        {activeCampaign && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Campanha Ativa</CardTitle>
                    <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                      {activeCampaign.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-base font-semibold text-foreground">
                    {activeCampaign.title}
                  </CardDescription>
                  {activeCampaign.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {activeCampaign.description}
                    </p>
                  )}
                  {activeCampaign.start_date && activeCampaign.end_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(activeCampaign.start_date), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(activeCampaign.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}
                </div>
                <Sparkles className="h-8 w-8 text-primary/30" />
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total de Posts</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{metrics.total}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">💡 Ideias</p>
              <p className="text-2xl font-bold text-foreground mt-1">{metrics.byStatus.idea}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">📝 Roteiro</p>
              <p className="text-2xl font-bold text-foreground mt-1">{metrics.byStatus.scripting}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">🎬 Gravação</p>
              <p className="text-2xl font-bold text-foreground mt-1">{metrics.byStatus.to_record}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">✂️ Edição</p>
              <p className="text-2xl font-bold text-foreground mt-1">{metrics.byStatus.editing}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">✅ Prontos</p>
              <p className="text-2xl font-bold text-foreground mt-1">{metrics.byStatus.ready}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">📅 Agendados</p>
              <p className="text-2xl font-bold text-foreground mt-1">{metrics.scheduled}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Kanban e Calendário */}
        <Tabs defaultValue="kanban" className="space-y-4">
          <TabsList>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Esteira de Produção
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendário
            </TabsTrigger>
          </TabsList>

          {/* Tab: Kanban */}
          <TabsContent value="kanban" className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhum post criado ainda
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comece criando seu primeiro post para a esteira de produção.
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <SocialPostKanban
                posts={posts}
                onEditPost={(post) => {
                  setEditingPost(post);
                  setDialogOpen(true);
                }}
                onDeletePost={handleDeletePost}
                onUpdateStatus={handleUpdateStatus}
              />
            )}
          </TabsContent>

          {/* Tab: Calendário */}
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </CardTitle>
                    <CardDescription>
                      Posts agendados para publicação
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => changeMonth(-1)}
                    >
                      ←
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                    >
                      Hoje
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => changeMonth(1)}
                    >
                      →
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {/* Dias da semana */}
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Dias do mês */}
                  {monthDays.map((day, idx) => {
                    const dayPosts = getPostsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    
                    return (
                      <div
                        key={idx}
                        className={`min-h-[80px] p-2 border rounded-lg ${
                          isToday 
                            ? 'bg-primary/10 border-primary' 
                            : isCurrentMonth 
                            ? 'bg-card border-border' 
                            : 'bg-muted/30 border-transparent'
                        }`}
                      >
                        <div className={`text-xs font-medium mb-1 ${
                          isToday 
                            ? 'text-primary font-bold' 
                            : isCurrentMonth 
                            ? 'text-foreground' 
                            : 'text-muted-foreground'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayPosts.slice(0, 2).map(post => (
                            <div
                              key={post.id}
                              className="text-[10px] p-1 bg-primary/10 text-primary rounded truncate cursor-pointer hover:bg-primary/20"
                              onClick={() => {
                                setEditingPost(post);
                                setDialogOpen(true);
                              }}
                              title={post.title}
                            >
                              {post.title}
                            </div>
                          ))}
                          {dayPosts.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayPosts.length - 2} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para criar/editar post */}
      <SocialPostDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPost(null);
        }}
        onSave={handleSavePost}
        post={editingPost}
        campaigns={campaigns}
      />
    </>
  );
};

export default SocialMedia;

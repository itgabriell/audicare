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

  // Debug log para verificar se componentes estão carregando
  console.log('[SocialMedia] Component loaded successfully');

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

      <div className="h-full flex flex-col space-y-4 overflow-hidden pr-1 relative">
        {/* Floating Header & Command Center */}
        <div className="flex flex-col gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans flex items-center gap-2">
                <LayoutGrid className="h-6 w-6 text-primary" />
                Gestão de Social Media
              </h1>
              <p className="text-muted-foreground text-sm">
                Esteira de produção para manter a constância nas postagens
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingPost(null);
                setDialogOpen(true);
              }}
              className="rounded-xl h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Post
            </Button>
          </div>

          {/* Compact Mini Metrics Bar - Horizontal Scroll */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            <div className="min-w-[100px] bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
              <div className="text-2xl font-black text-slate-700 dark:text-slate-200">{metrics.total}</div>
            </div>

            <div className="min-w-[100px] bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-2.5 border border-amber-100 dark:border-amber-900/30 flex flex-col justify-between shrink-0">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">💡 Ideias</span>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400">{metrics.byStatus.idea}</div>
            </div>

            <div className="min-w-[100px] bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-2.5 border border-blue-100 dark:border-blue-900/30 flex flex-col justify-between shrink-0">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">📝 Roteiro</span>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400">{metrics.byStatus.scripting}</div>
            </div>

            <div className="min-w-[100px] bg-sky-50 dark:bg-sky-900/10 rounded-2xl p-2.5 border border-sky-100 dark:border-sky-900/30 flex flex-col justify-between shrink-0">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">🎬 Gravar</span>
              <div className="text-2xl font-black text-sky-700 dark:text-sky-400">{metrics.byStatus.to_record}</div>
            </div>

            <div className="min-w-[100px] bg-pink-50 dark:bg-pink-900/10 rounded-2xl p-2.5 border border-pink-100 dark:border-pink-900/30 flex flex-col justify-between shrink-0">
              <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">✂️ Edição</span>
              <div className="text-2xl font-black text-pink-700 dark:text-pink-400">{metrics.byStatus.editing}</div>
            </div>

            <div className="min-w-[100px] bg-green-50 dark:bg-green-900/10 rounded-2xl p-2.5 border border-green-100 dark:border-green-900/30 flex flex-col justify-between shrink-0">
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">✅ Prontos</span>
              <div className="text-2xl font-black text-green-700 dark:text-green-400">{metrics.byStatus.ready}</div>
            </div>

            <div className="min-w-[120px] bg-cyan-50 dark:bg-cyan-900/10 rounded-2xl p-2.5 border border-cyan-100 dark:border-cyan-900/30 flex flex-col justify-between shrink-0">
              <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">📅 Agendados</span>
              <div className="text-2xl font-black text-cyan-700 dark:text-cyan-400">{metrics.scheduled}</div>
            </div>
          </div>
        </div>

        {/* Card de Campanha Ativa */}
        {activeCampaign && (
          <Card className="rounded-3xl border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent shadow-sm shrink-0">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary tracking-widest uppercase">Campanha Ativa</span>
                    <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 h-5 px-2 text-[10px]">
                      {activeCampaign.status}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">
                    {activeCampaign.title}
                  </h3>
                  {activeCampaign.description && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl line-clamp-1">
                      {activeCampaign.description}
                    </p>
                  )}
                </div>
                <div className="bg-primary/10 p-2.5 rounded-2xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            {activeCampaign.start_date && activeCampaign.end_date && (
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800/50 w-fit px-3 py-1 rounded-full">
                  <CalendarIcon className="h-3 w-3" />
                  {format(new Date(activeCampaign.start_date), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(activeCampaign.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </CardContent>
            )}
          </Card>
        )}

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
                        className={`min-h-[80px] p-2 border rounded-lg ${isToday
                          ? 'bg-primary/10 border-primary'
                          : isCurrentMonth
                            ? 'bg-card border-border'
                            : 'bg-muted/30 border-transparent'
                          }`}
                      >
                        <div className={`text-xs font-medium mb-1 ${isToday
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

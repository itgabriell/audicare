import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  Newspaper,
  Activity,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import WelcomeMessage from '@/components/WelcomeMessage';

const NEWS_CACHE_KEY = 'audiology_news_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Utility for exponential backoff
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const Home = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMounted = useRef(true);

  // State
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsSource, setNewsSource] = useState('loading'); // 'fresh', 'cache', 'fallback', 'error'

  const [stats, setStats] = useState({
    patients: null,
    appointments: null,
    tasks: null
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    fetchAllData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchWithRetry = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      await wait(delay);
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
  };

  const fetchAllData = async () => {
    if (!isMounted.current) return;
    setIsRefreshing(true);

    try {
      await Promise.allSettled([
        fetchNews(),
        fetchQuickStats()
      ]);
    } catch (error) {
      console.error("Critical error in fetchAllData:", error);
    } finally {
      if (isMounted.current) setIsRefreshing(false);
    }
  };

  const fetchNews = async (forceRefresh = false) => {
    if (!isMounted.current) return;
    setLoadingNews(true);

    try {
      // 1. Try Cache first (if not forced)
      if (!forceRefresh) {
        const cached = localStorage.getItem(NEWS_CACHE_KEY);
        if (cached) {
          try {
            const { timestamp, data } = JSON.parse(cached);
            const isValid = Array.isArray(data) && data.length > 0;
            const isFresh = Date.now() - timestamp < CACHE_DURATION;

            if (isValid && isFresh) {
              setNews(data);
              setNewsSource('cache');
              setLoadingNews(false);
              return;
            }
          } catch (e) {
            console.warn('Corrupted news cache, clearing...', e);
            localStorage.removeItem(NEWS_CACHE_KEY);
          }
        }
      }

      // 2. Fetch from Edge Function with Retry
      const fetchFunction = async () => {
        const { data, error } = await supabase.functions.invoke('audiology-news');
        if (error) throw error;
        return data;
      };

      const data = await fetchWithRetry(fetchFunction);

      const articles = data?.articles || data || [];
      const topArticles = Array.isArray(articles) ? articles.slice(0, 3) : [];

      if (topArticles.length > 0) {
        if (isMounted.current) {
          setNews(topArticles);
          setNewsSource('fresh');

          // Update Cache
          localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: topArticles
          }));
        }
      } else {
        throw new Error("No articles found");
      }

    } catch (error) {
      console.error('Error fetching news:', error);

      if (isMounted.current) {
        // 3. Fallback Data
        setNewsSource('fallback');
        setNews([
          {
            title: 'Avanços na Tecnologia de Aparelhos Auditivos em 2024',
            description: 'Novos algoritmos de IA prometem melhorar a clareza da fala em ambientes ruidosos e desafiadores.',
            url: '#',
            urlToImage: 'https://images.unsplash.com/photo-1583532452513-a02186582bc2?q=80&w=800&auto=format&fit=crop',
            source: { name: 'Audiology World' },
            publishedAt: new Date().toISOString()
          },
          {
            title: 'Importância do Diagnóstico Precoce na Perda Auditiva',
            description: 'Estudos recentes mostram forte correlação entre tratamento auditivo precoce e saúde cognitiva a longo prazo.',
            url: '#',
            urlToImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop',
            source: { name: 'Health News' },
            publishedAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            title: 'Novas Diretrizes para Adaptação Pediátrica',
            description: 'Consenso internacional atualiza protocolos para bebês e crianças, focando em intervenção familiar.',
            url: '#',
            urlToImage: 'https://images.unsplash.com/photo-1516574187841-693018954312?q=80&w=800&auto=format&fit=crop',
            source: { name: 'Pediatric Care' },
            publishedAt: new Date(Date.now() - 172800000).toISOString()
          }
        ]);
      }
    } finally {
      if (isMounted.current) setLoadingNews(false);
    }
  };

  const fetchQuickStats = async () => {
    if (!isMounted.current) return;
    setLoadingStats(true);
    setStatsError(false);

    try {
      const fetchCount = async (table, queryModifier) => {
        let query = supabase.from(table).select('id', { count: 'exact', head: true });
        if (queryModifier) query = queryModifier(query);

        // Add a timeout to the promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const { count, error } = await Promise.race([query, timeoutPromise]);
        if (error) throw error;
        return count;
      };

      const [patientsCount, appointmentsCount, tasksCount] = await Promise.all([
        fetchCount('patients'),
        fetchCount('appointments', (q) => q.gte('start_time', new Date().toISOString())),
        fetchCount('tasks', (q) => q.eq('status', 'pending'))
      ]);

      if (isMounted.current) {
        setStats({
          patients: patientsCount || 0,
          appointments: appointmentsCount || 0,
          tasks: tasksCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      if (isMounted.current) {
        setStatsError(true);
        toast({
          title: "Erro ao carregar estatísticas",
          description: "Verifique sua conexão e tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      if (isMounted.current) setLoadingStats(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  // Helper to render stat value safely
  const renderStatValue = (value) => {
    if (loadingStats) return <Skeleton className="h-9 w-20" />;
    if (statsError || value === null) return <span className="text-destructive text-xl">-</span>;
    return value;
  };

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto">
      <Helmet>
        <title>Início - Audicare</title>
        <meta name="description" content="Dashboard principal do Audicare - Visão geral da sua clínica." />
      </Helmet>

      <WelcomeMessage />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho da sua clínica e as últimas novidades.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsRefreshing(true);
            Promise.all([fetchNews(true), fetchQuickStats()]).then(() => {
              if (isMounted.current) setIsRefreshing(false);
            });
          }}
          disabled={isRefreshing}
          className="w-full md:w-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Quick Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pacientes</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {renderStatValue(stats.patients)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Base ativa
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próximos Agendamentos</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:scale-110 transition-transform">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {renderStatValue(stats.appointments)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-green-500" />
                Futuros
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tarefas Pendentes</CardTitle>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full group-hover:scale-110 transition-transform">
                <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {renderStatValue(stats.tasks)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                Atenção necessária
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* News Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              Notícias de Audiologia
            </h2>

            {/* Data Source Indicator */}
            <div className="flex items-center gap-2">
              {newsSource === 'cache' && (
                <Badge variant="secondary" className="text-xs gap-1 hidden sm:flex" title="Dados carregados do cache local">
                  <Database className="h-3 w-3" />
                  Cache
                </Badge>
              )}
              {newsSource === 'fresh' && (
                <Badge variant="outline" className="text-xs gap-1 hidden sm:flex text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                  <Wifi className="h-3 w-3" />
                  Ao vivo
                </Badge>
              )}
              {newsSource === 'fallback' && (
                <Badge variant="outline" className="text-xs gap-1 hidden sm:flex text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            {loadingNews ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                    <Skeleton className="h-48 sm:h-auto sm:w-48 shrink-0" />
                    <div className="p-6 space-y-3 w-full">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              news.map((article, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer h-full border-muted/60">
                    <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                      {/* Image Section */}
                      <div className="relative h-48 sm:h-auto sm:w-48 shrink-0 overflow-hidden bg-muted">
                        {article.urlToImage ? (
                          <img
                            src={article.urlToImage}
                            alt={article.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
                          style={{ display: article.urlToImage ? 'none' : 'flex' }}
                        >
                          <Newspaper className="h-10 w-10 opacity-20" />
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-6 flex flex-col justify-between w-full">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                              {article.source?.name || 'Notícia'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {article.publishedAt ? format(new Date(article.publishedAt), "d MMM", { locale: ptBR }) : 'Recente'}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                            {article.title}
                          </h3>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.description}
                          </p>
                        </div>

                        <div className="pt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                          Ler artigo completo <ExternalLink className="ml-1 h-3 w-3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Actions / Sidebar Widgets */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Acesso Rápido
          </h2>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Atalhos do Sistema</CardTitle>
              <CardDescription>Navegue rapidamente para as funções mais usadas</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="ghost" className="w-full justify-start h-12 hover:bg-muted/50" asChild>
                <Link to="/crm">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mr-3">
                    <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  CRM & Vendas
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start h-12 hover:bg-muted/50" asChild>
                <Link to="/tasks">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mr-3">
                    <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  Minhas Tarefas
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start h-12 hover:bg-muted/50" asChild>
                <Link to="/email-campaigns">
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-2xl mr-3">
                    <Users className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  Campanhas de E-mail
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-dashed border-2 shadow-none">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-background rounded-full shadow-sm ring-1 ring-border">
                <Loader2 className="h-6 w-6 text-primary animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-semibold">Sincronização Ativa</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Seus dados estão sendo sincronizados em tempo real com o servidor.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;

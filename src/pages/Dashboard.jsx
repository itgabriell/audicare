import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getDashboardMetrics } from '@/database';
import { 
  Activity, 
  Clock, 
  RefreshCcw, 
  Target, 
  TrendingUp, 
  Users, 
  Instagram, 
  Globe, 
  MessageCircle,
  Share2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const Dashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Helpers de Ícone e Cor para Origem
  const getSourceIcon = (source) => {
    switch(source) {
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'facebook': return <span className="font-bold text-blue-600 text-xs">FB</span>;
      case 'whatsapp': return <MessageCircle className="h-4 w-4 text-green-600" />;
      case 'site': return <Globe className="h-4 w-4 text-blue-500" />; // "google" cai aqui se mapeado como site
      case 'google': return <Globe className="h-4 w-4 text-blue-500" />;
      case 'referral': return <Share2 className="h-4 w-4 text-purple-600" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSlaColor = (minutes) => {
    if (minutes <= 5) return 'text-green-600';
    if (minutes <= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Dashboard - Audicare</title>
      </Helmet>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">
          Performance dos últimos 30 dias.
        </p>
      </div>

      {/* --- CARDS PRINCIPAIS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Tempo de Resposta */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tempo Médio de Resposta
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSlaColor(metrics?.avgResponseTimeMinutes || 0)}`}>
              {metrics?.avgResponseTimeMinutes || 0} min
            </div>
            <p className="text-xs text-muted-foreground">
              Do 1º contato até a resposta
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Leads Totais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Novos Leads (Mês)
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalLeadsMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              +10% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Taxa de Resgate (Automations) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Resgate
            </CardTitle>
            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.rescueRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalRescued || 0} recuperados de {metrics?.totalFollowups || 0} tentativas
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Conversão em Agendamento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Agendamento
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.totalLeadsMonth > 0 
                ? Math.round((metrics.funnel.scheduled / metrics.totalLeadsMonth) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Leads que viraram consulta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- SEGUNDA LINHA: GRÁFICOS E LISTAS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Origem dos Leads */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Origem dos Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.sources && Object.entries(metrics.sources)
                .sort(([,a], [,b]) => b - a) // Ordenar do maior para menor
                .map(([source, count]) => (
                  <div key={source} className="flex items-center">
                    <div className="flex items-center gap-2 w-32">
                        {getSourceIcon(source)}
                        <span className="text-sm font-medium capitalize truncate">
                            {source === 'site' ? 'Google/Site' : source}
                        </span>
                    </div>
                    <div className="flex-1 mx-4">
                       {/* Barra de Progresso relativa ao total */}
                       <Progress value={(count / metrics.totalLeadsMonth) * 100} className="h-2" />
                    </div>
                    <div className="w-12 text-right text-sm text-muted-foreground">
                        {count}
                    </div>
                  </div>
              ))}
              
              {(!metrics?.sources || Object.keys(metrics.sources).length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-6">
                      Nenhum dado de origem detectado ainda.
                  </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Funil de Vendas Simplificado */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8 mt-4">
                
                {/* Etapa 1: Leads */}
                <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Total de Leads</p>
                        <p className="text-xs text-muted-foreground">Entrada no funil</p>
                    </div>
                    <div className="font-bold">{metrics?.funnel.total || 0}</div>
                </div>

                <div className="flex justify-center -my-2">
                    <div className="h-4 w-0.5 bg-border"></div>
                </div>

                {/* Etapa 2: Agendados */}
                <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Agendamentos</p>
                        <p className="text-xs text-muted-foreground">Conversão: {
                             metrics?.totalLeadsMonth > 0 
                             ? Math.round((metrics.funnel.scheduled / metrics.totalLeadsMonth) * 100) 
                             : 0
                        }%</p>
                    </div>
                    <div className="font-bold">{metrics?.funnel.scheduled || 0}</div>
                </div>

                <div className="flex justify-center -my-2">
                    <div className="h-4 w-0.5 bg-border"></div>
                </div>

                {/* Etapa 3: Vendas */}
                <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Vendas Realizadas</p>
                        <p className="text-xs text-muted-foreground">Fechamento: {
                            metrics?.funnel.scheduled > 0 
                            ? Math.round((metrics.funnel.purchased / metrics.funnel.scheduled) * 100) 
                            : 0
                        }%</p>
                    </div>
                    <div className="font-bold">{metrics?.funnel.purchased || 0}</div>
                </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
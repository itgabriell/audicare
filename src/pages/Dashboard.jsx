import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { FeatureFlag, FEATURES } from '@/lib/featureFlags';
import {
  Users,
  Calendar,
  Wrench,
  CheckSquare,
  Sun,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  UserPlus,
  ArrowRight,
  PieChart,
  Brain,
  BarChart3,
  Sparkles
} from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import AnalyticsInsights from '@/components/dashboard/AnalyticsInsights';
import { SmartTooltip, ContextualTooltip } from '@/components/ui/smart-tooltip';
import { AdvancedConfirmModal, AdvancedSuccessModal } from '@/components/ui/advanced-modal';
import { ComponentLoadingOverlay, SmartSkeleton, AdvancedSpinner } from '@/components/ui/advanced-loading';
import { useAdvancedToast } from '@/components/ui/advanced-toast';
import { useToast } from '@/components/ui/use-toast';
import {
  getPatients,
  getAppointments,
  getRepairs,
  getTasks,
} from '@/database';
import { usePatients } from '@/hooks/usePatients';
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, endOfMonth, subMonths, isToday, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

// helper simples de storage (evita erro no SSR)
const getLocalStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const setLocalStorage = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignora
  }
};

// Cores para gráficos
const COLORS = {
  completed: '#10b981', // green
  cancelled: '#ef4444', // red
  no_show: '#f59e0b', // amber
  scheduled: '#3b82f6', // blue
  confirmed: '#8b5cf6', // purple
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    appointmentsToday: 0,
    openRepairs: 0,
    pendingTasks: 0,
  });
  
  const [metrics, setMetrics] = useState({
    noShowRate: { percentage: 0, total: 0, noShow: 0, completed: 0, cancelled: 0 },
    appointmentMix: [],
    newPatients: { currentMonth: 0, lastMonth: 0, trend: 0 },
    todayAppointments: [],
    appointmentTypes: [],
    appointmentsTrend: 0,
    appointmentsCount: { current: 0, last: 0 },
    returnRate: { firstTime: 0, returns: 0, percentage: 0 },
  });
  
  const [taskStatusData, setTaskStatusData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dailyHighlights, setDailyHighlights] = useState(null);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { toast } = useToast();

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [patientsResult, appointments, repairs, tasks] =
        await Promise.all([
          getPatients(1, 500), // Reduzido para 500 pacientes para melhor performance
          getAppointments(),
          getRepairs(),
          getTasks(),
        ]);

      const patientCount =
        typeof patientsResult?.count === 'number'
          ? patientsResult.count
          : 0;

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);
      const startOfLastMonth = startOfMonth(subMonths(now, 1));
      const endOfLastMonth = endOfMonth(subMonths(now, 1));

      // Appointments do dia
      const appointmentsToday = Array.isArray(appointments)
        ? appointments.filter((apt) => {
            if (!apt.appointment_date) return false;
            const aptDate = new Date(apt.appointment_date);
            return isToday(aptDate);
          }).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
        : [];

      // Próximos 5 agendamentos de hoje
      const nextAppointments = appointmentsToday
        .slice(0, 5)
        .map(apt => ({
          ...apt,
          time: format(new Date(apt.appointment_date), 'HH:mm', { locale: ptBR }),
          patientName: apt.patient?.name || 'Paciente não encontrado'
        }));

      // Taxa de Comparecimento (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentAppointments = Array.isArray(appointments)
        ? appointments.filter((apt) => {
            if (!apt.appointment_date) return false;
            const aptDate = new Date(apt.appointment_date);
            return aptDate >= thirtyDaysAgo && 
                   ['completed', 'cancelled', 'no_show'].includes(apt.status);
          })
        : [];

      const completed = recentAppointments.filter(a => a.status === 'completed').length;
      const cancelled = recentAppointments.filter(a => a.status === 'cancelled').length;
      const noShow = recentAppointments.filter(a => a.status === 'no_show').length;
      const total = recentAppointments.length;
      
      const noShowRate = total > 0 ? ((noShow / total) * 100).toFixed(1) : 0;

      // Mix de Atendimentos (tipos de consulta) - Categorizado
      const returnTypes = ['Retorno', 'retorno', 'Ajuste', 'ajuste'];
      const firstTimeTypes = ['Primeiro', 'primeiro', 'Avaliação', 'avaliação', 'Consulta Inicial'];
      
      let totalFirstTime = 0;
      let totalReturns = 0;
      let otherTypes = {};
      const typeCounts = {};
      
      if (Array.isArray(appointments)) {
        appointments.forEach(apt => {
          const type = apt.appointment_type || 'Não especificado';
          const typeLower = type.toLowerCase();
          
          // Categorizar como primeira vez ou retorno
          const isFirstTime = firstTimeTypes.some(term => typeLower.includes(term.toLowerCase()));
          const isReturn = returnTypes.some(term => typeLower.includes(term.toLowerCase()));
          
          if (isFirstTime) {
            totalFirstTime++;
          } else if (isReturn) {
            totalReturns++;
          } else {
            otherTypes[type] = (otherTypes[type] || 0) + 1;
          }
          
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
      }

      // Criar mix categorizado
      const appointmentMix = [];
      if (totalFirstTime > 0) {
        appointmentMix.push({ name: 'Primeira Consulta', value: totalFirstTime, category: 'first' });
      }
      if (totalReturns > 0) {
        appointmentMix.push({ name: 'Retornos', value: totalReturns, category: 'return' });
      }
      // Adicionar outros tipos
      Object.entries(otherTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([name, value]) => {
          appointmentMix.push({ name, value, category: 'other' });
        });
      
      appointmentMix.sort((a, b) => b.value - a.value);

      // Novos Pacientes
      const patientsData = patientsResult?.data || [];
      const currentMonthPatients = patientsData.filter(p => {
        if (!p.created_at) return false;
        const createdDate = new Date(p.created_at);
        return createdDate >= startOfCurrentMonth && createdDate <= endOfCurrentMonth;
      }).length;

      const lastMonthPatients = patientsData.filter(p => {
        if (!p.created_at) return false;
        const createdDate = new Date(p.created_at);
        return createdDate >= startOfLastMonth && createdDate <= endOfLastMonth;
      }).length;

      const trend = lastMonthPatients > 0 
        ? (((currentMonthPatients - lastMonthPatients) / lastMonthPatients) * 100).toFixed(1)
        : currentMonthPatients > 0 ? 100 : 0;

      const openRepairs = Array.isArray(repairs)
        ? repairs.filter((r) => r.status !== 'delivered').length
        : 0;

      const pendingTasks = Array.isArray(tasks)
        ? tasks.filter((t) => t.status !== 'done').length
        : 0;

      setStats({
        totalPatients: patientCount,
        appointmentsToday: appointmentsToday.length,
        openRepairs,
        pendingTasks,
      });

      // Calcular taxa de retorno (comparação temporal)
      const lastMonthAppointments = Array.isArray(appointments)
        ? appointments.filter((apt) => {
            if (!apt.appointment_date) return false;
            const aptDate = new Date(apt.appointment_date);
            return aptDate >= startOfLastMonth && aptDate <= endOfLastMonth;
          })
        : [];
      
      const currentMonthAppointments = Array.isArray(appointments)
        ? appointments.filter((apt) => {
            if (!apt.appointment_date) return false;
            const aptDate = new Date(apt.appointment_date);
            return aptDate >= startOfCurrentMonth && aptDate <= endOfCurrentMonth;
          })
        : [];
      
      const appointmentsTrend = lastMonthAppointments.length > 0
        ? (((currentMonthAppointments.length - lastMonthAppointments.length) / lastMonthAppointments.length) * 100).toFixed(1)
        : currentMonthAppointments.length > 0 ? 100 : 0;

      setMetrics({
        noShowRate: {
          percentage: parseFloat(noShowRate),
          total,
          noShow,
          completed,
          cancelled,
        },
        appointmentMix,
        newPatients: {
          currentMonth: currentMonthPatients,
          lastMonth: lastMonthPatients,
          trend: parseFloat(trend),
        },
        todayAppointments: nextAppointments,
        appointmentTypes: [
          { name: 'Concluídos', value: completed, color: COLORS.completed },
          { name: 'Cancelados', value: cancelled, color: COLORS.cancelled },
          { name: 'Não Compareceu', value: noShow, color: COLORS.no_show },
        ].filter(item => item.value > 0),
        appointmentsTrend: parseFloat(appointmentsTrend),
        appointmentsCount: {
          current: currentMonthAppointments.length,
          last: lastMonthAppointments.length,
        },
        returnRate: {
          firstTime: totalFirstTime,
          returns: totalReturns,
          percentage: (totalFirstTime + totalReturns) > 0 
            ? ((totalReturns / (totalFirstTime + totalReturns)) * 100).toFixed(1) 
            : 0,
        },
      });

      if (Array.isArray(tasks) && tasks.length > 0) {
        const todo = tasks.filter((t) => t.status === 'todo').length;
        const doing = tasks.filter((t) => t.status === 'doing').length;
        const done = tasks.filter((t) => t.status === 'done').length;

        setTaskStatusData([
          {
            name: 'Status',
            'A Fazer': todo,
            'Em Andamento': doing,
            'Concluído': done,
          },
        ]);
      } else {
        setTaskStatusData([]);
      }

      const highlights = {
        date: today,
        appointmentsToday: appointmentsToday.length,
        openRepairs,
        pendingTasks,
      };
      setDailyHighlights(highlights);

      // controla se já foi visto hoje
      const seenKey = 'audicare_daily_highlights';
      const seen = getLocalStorage(seenKey, null);
      if (!seen || seen.date !== today) {
        setHighlightsOpen(true);
      }
    } catch (error) {
      console.error('[Dashboard] Erro ao carregar dados', error);
      toast({
        title: 'Erro ao carregar dados',
        description:
          error?.message ||
          'Ocorreu um erro ao buscar informações do dashboard.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const closeHighlights = () => {
    if (dailyHighlights?.date) {
      setLocalStorage('audicare_daily_highlights', {
        date: dailyHighlights.date,
      });
    }
    setHighlightsOpen(false);
  };

  const hasTaskData =
    Array.isArray(taskStatusData) && taskStatusData.length > 0;

  return (
    <>
      <Helmet>
        <title>Dashboard - Audicare</title>
        <meta
          name="description"
          content="Visão geral do sistema Audicare"
        />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {showAnalytics ? 'Analytics inteligente com IA' : 'Visão geral da clínica e métricas essenciais'}
            </p>
          </div>
          <FeatureFlag
            feature={FEATURES.DASHBOARD_ANALYTICS}
            fallback={
              <Button
                variant="outline"
                disabled
                className="flex items-center gap-2 opacity-50"
              >
                <Brain className="h-4 w-4" />
                Analytics IA (Em Breve)
              </Button>
            }
          >
            <Button
              variant={showAnalytics ? 'default' : 'outline'}
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              {showAnalytics ? 'Visão Padrão' : 'Analytics IA'}
              <Sparkles className="h-3 w-3" />
            </Button>
          </FeatureFlag>
        </div>

        {/* Cards Principais com Links de Navegação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Link to="/patients" className="block">
              <StatsCard
                title="Total de Pacientes"
                value={loading ? '...' : stats.totalPatients}
                icon={Users}
              />
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/appointments" className="block">
              <StatsCard
                title="Consultas Hoje"
                value={loading ? '...' : stats.appointmentsToday}
                icon={Calendar}
              />
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/repairs" className="block">
              <StatsCard
                title="Reparos em Aberto"
                value={loading ? '...' : stats.openRepairs}
                icon={Wrench}
                variant={stats.openRepairs > 5 ? 'destructive' : 'default'}
              />
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/tasks" className="block">
              <StatsCard
                title="Tarefas Pendentes"
                value={loading ? '...' : stats.pendingTasks}
                icon={CheckSquare}
              />
            </Link>
          </motion.div>
        </div>

        {/* Métricas Essenciais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Taxa de Comparecimento */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Taxa de Comparecimento
                  </CardTitle>
                  <CardDescription>
                    Últimos 30 dias - {metrics.noShowRate.total} agendamentos
                  </CardDescription>
                </div>
                <Badge 
                  variant={metrics.noShowRate.percentage > 15 ? 'destructive' : metrics.noShowRate.percentage > 10 ? 'default' : 'secondary'}
                  className="text-lg px-3 py-1"
                >
                  {metrics.noShowRate.percentage}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Skeleton className="h-48 w-48 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                  </div>
                </div>
              ) : metrics.noShowRate.total === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground space-y-3">
                  <PieChart className="h-12 w-12 opacity-20" />
                  <div className="text-center">
                    <p className="font-medium">Dados insuficientes</p>
                    <p className="text-xs mt-1">É necessário ter agendamentos concluídos nos últimos 30 dias</p>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link to="/appointments">
                        Ver Agendamentos
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={metrics.appointmentTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {metrics.appointmentTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
              {metrics.noShowRate.percentage > 15 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Atenção:</strong> Taxa de não comparecimento acima de 15%. 
                    Considere reforçar lembretes e confirmações.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Mix de Atendimentos com Taxa de Retorno */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-primary" />
                    Mix de Atendimentos
                  </CardTitle>
                  <CardDescription>
                    Distribuição por tipo de consulta
                    {metrics.returnRate.percentage > 0 && (
                      <span className="ml-2 text-primary font-medium">
                        • Taxa de Retorno: {metrics.returnRate.percentage}%
                      </span>
                    )}
                  </CardDescription>
                </div>
                {metrics.returnRate.returns > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <UserPlus className="h-3 w-3 mr-1" />
                      {metrics.returnRate.firstTime} primeiras
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <ArrowRight className="h-3 w-3 mr-1" />
                      {metrics.returnRate.returns} retornos
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : metrics.appointmentMix.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground space-y-3">
                  <BarChart className="h-12 w-12 opacity-20" />
                  <div className="text-center">
                    <p className="font-medium">Nenhum dado disponível</p>
                    <p className="text-xs mt-1">Comece agendando consultas para ver a distribuição</p>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link to="/appointments">
                        Criar Agendamento
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={metrics.appointmentMix} layout="vertical">
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                        contentStyle={{
                          background: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.5rem',
                          fontSize: '0.8rem',
                        }}
                        formatter={(value) => `${value} consultas`}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 4, 4, 0]}
                      >
                        {metrics.appointmentMix.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.category === 'first' ? COLORS.completed :
                              entry.category === 'return' ? COLORS.confirmed :
                              'hsl(var(--primary))'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {metrics.returnRate.returns > 0 && metrics.returnRate.firstTime > 0 && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de Retenção:</span>
                      <span className="font-semibold text-foreground">
                        {metrics.returnRate.percentage}% dos pacientes retornam
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Novos Pacientes com Comparação Temporal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      Novos Pacientes
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/patients">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : (
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-bold text-foreground">
                        {metrics.newPatients.currentMonth}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {metrics.newPatients.lastMonth} no mês anterior
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      {metrics.newPatients.trend > 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1 text-green-600 dark:text-green-400"
                        >
                          <TrendingUp className="h-5 w-5" />
                          <span className="text-lg font-semibold">+{Math.abs(metrics.newPatients.trend)}%</span>
                        </motion.div>
                      ) : metrics.newPatients.trend < 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1 text-red-600 dark:text-red-400"
                        >
                          <TrendingDown className="h-5 w-5" />
                          <span className="text-lg font-semibold">{Math.abs(metrics.newPatients.trend)}%</span>
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-lg font-semibold">-</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">vs mês anterior</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Agenda do Dia */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Agenda do Dia
                    </CardTitle>
                    <CardDescription>
                      Próximos atendimentos de hoje
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/appointments">
                      Ver todos
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : metrics.todayAppointments.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground space-y-3">
                    <Calendar className="h-12 w-12 opacity-20" />
                    <div className="text-center">
                      <p className="font-medium">Dia livre!</p>
                      <p className="text-xs mt-1">Nenhum agendamento para hoje</p>
                      <Button variant="outline" size="sm" className="mt-4" asChild>
                        <Link to="/appointments">
                          Agendar Consulta
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metrics.todayAppointments.map((apt, index) => (
                      <motion.div
                        key={apt.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = '/appointments'}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-semibold shrink-0">
                            <span className="text-xs">{apt.time}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{apt.patientName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {apt.appointment_type || 'Consulta'}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            apt.status === 'completed' ? 'default' :
                            apt.status === 'cancelled' || apt.status === 'no_show' ? 'destructive' :
                            apt.status === 'confirmed' ? 'secondary' : 'outline'
                          }
                          className="shrink-0 ml-2"
                        >
                          {apt.status === 'scheduled' ? 'Agendado' :
                           apt.status === 'confirmed' ? 'Confirmado' :
                           apt.status === 'completed' ? 'Concluído' :
                           apt.status === 'cancelled' ? 'Cancelado' :
                           apt.status === 'no_show' ? 'Não compareceu' : apt.status}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Alertas Inteligentes */}
        <AnimatePresence>
          {stats.openRepairs > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                      <CardTitle className="text-amber-900 dark:text-amber-100">
                        Aparelhos em Reparo
                      </CardTitle>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-amber-300 dark:border-amber-700">
                      <Link to="/repairs">
                        Gerenciar
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                  <CardDescription className="text-amber-800 dark:text-amber-200">
                    {stats.openRepairs} {stats.openRepairs === 1 ? 'reparo pendente' : 'reparos pendentes'} - 
                    Pacientes aguardando retorno. {stats.openRepairs > 5 && 'Considere priorizar a entrega.'}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          )}
          {metrics.noShowRate.percentage > 15 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 shadow-lg mt-4">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <CardTitle className="text-red-900 dark:text-red-100">
                        Taxa de Não Comparecimento Alta
                      </CardTitle>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-red-300 dark:border-red-700">
                      <Link to="/appointments">
                        Ver Agendamentos
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                  <CardDescription className="text-red-800 dark:text-red-200">
                    Taxa de {metrics.noShowRate.percentage}% nos últimos 30 dias. 
                    Reforce lembretes e confirmações para reduzir faltas.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analytics Inteligente */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnalyticsInsights
                appointments={[]} // TODO: Passar dados reais dos agendamentos
                patients={[]} // TODO: Passar dados reais dos pacientes
                loading={loading}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visão Padrão - Tarefas Internas */}
        {!showAnalytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl shadow-sm border p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Status dos Processos Internos
            </h2>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : !hasTaskData ? (
              <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground space-y-3">
                <CheckSquare className="h-12 w-12 opacity-20" />
                <div className="text-center">
                  <p className="font-medium">Nenhuma tarefa cadastrada</p>
                  <p className="text-xs mt-1">Comece criando tarefas para acompanhar o progresso</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link to="/tasks">
                      Criar Tarefa
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={taskStatusData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="A Fazer"
                    stackId="a"
                    fill="hsl(var(--primary))"
                    radius={[4, 0, 0, 4]}
                  />
                  <Bar
                    dataKey="Em Andamento"
                    stackId="a"
                    fill="hsl(var(--secondary))"
                  />
                  <Bar
                    dataKey="Concluído"
                    stackId="a"
                    fill="hsl(var(--accent-foreground))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        )}
      </div>

      {/* Popup de novidades do dia */}
      <AnimatePresence>
        {highlightsOpen && dailyHighlights && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeHighlights}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.5 }}
              className="relative m-4 w-full max-w-lg rounded-2xl bg-card/80 dark:bg-card/60 backdrop-blur-xl border shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center"
            >
              <motion.div
                className="absolute -top-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
              >
                <Sun className="h-8 w-8" />
              </motion.div>
              
              <div className="mt-8 text-center space-y-2">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="text-2xl font-bold tracking-tight text-foreground"
                >
                  Um ótimo dia para você!
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="text-sm text-muted-foreground"
                >
                  Aqui estão seus destaques para começar bem o dia.
                </motion.p>
              </div>

              <motion.div 
                className="mt-6 w-full space-y-3"
                variants={{
                  visible: { 
                    transition: { 
                      staggerChildren: 0.1,
                      delayChildren: 0.5,
                    } 
                  }
                }}
                initial="hidden"
                animate="visible"
              >
                {[
                  { icon: Calendar, label: 'Consultas agendadas', value: dailyHighlights.appointmentsToday },
                  { icon: Wrench, label: 'Reparos em aberto', value: dailyHighlights.openRepairs },
                  { icon: CheckSquare, label: 'Tarefas pendentes', value: dailyHighlights.pendingTasks },
                ].map((item, index) => (
                   <motion.div
                    key={index}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex items-center justify-between rounded-lg bg-background/50 border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-foreground">{item.label}</span>
                    </div>
                    <span className="font-semibold text-foreground bg-muted rounded-md px-2 py-0.5 text-sm">
                      {item.value}
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div 
                className="mt-8 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <Button size="lg" className="w-full" onClick={closeHighlights}>
                  Começar o dia
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Dashboard;

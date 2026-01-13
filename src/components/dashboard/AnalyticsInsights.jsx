import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Lightbulb,
  AlertTriangle,
  Target,
  Clock,
  Calendar,
  Users,
  BarChart3,
  Sparkles,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cores para gráficos
const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4'
};

const AnalyticsInsights = ({ appointments = [], patients = [], loading = false }) => {
  const [insights, setInsights] = useState({
    demandPrediction: null,
    patterns: [],
    recommendations: [],
    alerts: []
  });

  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d
  const [refreshing, setRefreshing] = useState(false);

  // Processar dados para analytics
  const analyticsData = useMemo(() => {
    if (!appointments.length) return null;

    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = subDays(now, days);

    // Filtrar appointments no período
    const periodAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date || apt.scheduled_at || apt.created_at);
      return aptDate >= startDate && aptDate <= now;
    });

    // Agrupar por dia
    const dailyData = {};
    eachDayOfInterval({ start: startDate, end: now }).forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      dailyData[dateStr] = {
        date: dateStr,
        appointments: 0,
        noShows: 0,
        cancellations: 0,
        completed: 0
      };
    });

    periodAppointments.forEach(apt => {
      const aptDate = new Date(apt.appointment_date || apt.scheduled_at || apt.created_at);
      const dateStr = format(aptDate, 'yyyy-MM-dd');

      if (dailyData[dateStr]) {
        dailyData[dateStr].appointments++;
        switch (apt.status) {
          case 'no_show':
            dailyData[dateStr].noShows++;
            break;
          case 'cancelled':
            dailyData[dateStr].cancellations++;
            break;
          case 'completed':
            dailyData[dateStr].completed++;
            break;
        }
      }
    });

    // Converter para array e calcular médias móveis
    const dailyArray = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    // Calcular médias móveis de 7 dias
    dailyArray.forEach((day, index) => {
      if (index >= 6) {
        const weekData = dailyArray.slice(index - 6, index + 1);
        day.avgAppointments = weekData.reduce((sum, d) => sum + d.appointments, 0) / 7;
        day.avgNoShowRate = weekData.reduce((sum, d) => sum + (d.noShows / Math.max(d.appointments, 1)), 0) / 7;
      }
    });

    // Estatísticas gerais
    const totalAppointments = periodAppointments.length;
    const totalNoShows = periodAppointments.filter(apt => apt.status === 'no_show').length;
    const totalCancellations = periodAppointments.filter(apt => apt.status === 'cancelled').length;
    const totalCompleted = periodAppointments.filter(apt => apt.status === 'completed').length;

    const noShowRate = totalAppointments > 0 ? (totalNoShows / totalAppointments) * 100 : 0;
    const cancellationRate = totalAppointments > 0 ? (totalCancellations / totalAppointments) * 100 : 0;

    // Padrões por dia da semana
    const weekdayStats = {};
    periodAppointments.forEach(apt => {
      const aptDate = new Date(apt.appointment_date || apt.scheduled_at || apt.created_at);
      const weekday = aptDate.getDay();
      if (!weekdayStats[weekday]) {
        weekdayStats[weekday] = { total: 0, noShows: 0, completed: 0 };
      }
      weekdayStats[weekday].total++;
      if (apt.status === 'no_show') weekdayStats[weekday].noShows++;
      if (apt.status === 'completed') weekdayStats[weekday].completed++;
    });

    return {
      dailyData: dailyArray,
      totalAppointments,
      noShowRate,
      cancellationRate,
      weekdayStats,
      periodAppointments
    };
  }, [appointments, timeRange]);

  // Gerar insights baseados nos dados
  const generateInsights = useMemo(() => {
    if (!analyticsData) return { demandPrediction: null, patterns: [], recommendations: [], alerts: [] };

    const { dailyData, noShowRate, cancellationRate, weekdayStats, totalAppointments } = analyticsData;

    const insights = {
      demandPrediction: null,
      patterns: [],
      recommendations: [],
      alerts: []
    };

    // 1. Previsão de demanda
    if (dailyData.length >= 14) {
      const recentData = dailyData.slice(-14);
      const avgRecent = recentData.reduce((sum, day) => sum + day.appointments, 0) / recentData.length;
      const trend = recentData.length >= 2 ?
        (recentData[recentData.length - 1].appointments - recentData[0].appointments) / recentData.length : 0;

      const nextWeekPrediction = Math.max(0, Math.round(avgRecent + (trend * 7)));

      insights.demandPrediction = {
        currentAvg: Math.round(avgRecent),
        predicted: nextWeekPrediction,
        trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        confidence: recentData.length >= 7 ? 'high' : 'medium'
      };
    }

    // 2. Detecção de padrões
    const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    Object.entries(weekdayStats).forEach(([weekday, stats]) => {
      if (stats.total >= 3) { // Pelo menos 3 agendamentos para considerar padrão
        const noShowRate = (stats.noShows / stats.total) * 100;

        if (noShowRate > 20) {
          insights.patterns.push({
            type: 'high_no_show',
            day: weekdayNames[parseInt(weekday)],
            rate: noShowRate.toFixed(1),
            severity: noShowRate > 30 ? 'high' : 'medium'
          });
        }

        if (stats.total > 8) { // Dia muito ocupado
          insights.patterns.push({
            type: 'busy_day',
            day: weekdayNames[parseInt(weekday)],
            total: stats.total,
            severity: 'info'
          });
        }
      }
    });

    // Padrão de horário preferido
    const hourStats = {};
    analyticsData.periodAppointments.forEach(apt => {
      const aptDate = new Date(apt.appointment_date || apt.scheduled_at || apt.created_at);
      const hour = aptDate.getHours();
      if (!hourStats[hour]) hourStats[hour] = 0;
      hourStats[hour]++;
    });

    const peakHour = Object.entries(hourStats).sort(([,a], [,b]) => b - a)[0];
    if (peakHour && peakHour[1] >= 5) {
      insights.patterns.push({
        type: 'peak_hour',
        hour: `${peakHour[0]}:00`,
        appointments: peakHour[1],
        severity: 'info'
      });
    }

    // 3. Recomendações
    if (noShowRate > 15) {
      insights.recommendations.push({
        type: 'reminder_system',
        title: 'Implementar Sistema de Lembretes',
        description: 'Configure lembretes automáticos por WhatsApp/SMS para reduzir faltas',
        impact: 'high',
        effort: 'medium'
      });
    }

    if (cancellationRate > 10) {
      insights.recommendations.push({
        type: 'confirmation_policy',
        title: 'Política de Confirmação',
        description: 'Exija confirmação 24h antes das consultas',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Otimização de horários baseada em padrões
    const busyDays = Object.entries(weekdayStats)
      .filter(([, stats]) => stats.total > 6)
      .map(([day]) => weekdayNames[parseInt(day)]);

    if (busyDays.length > 0) {
      insights.recommendations.push({
        type: 'capacity_planning',
        title: 'Planejamento de Capacidade',
        description: `Considere adicionar mais horários nas ${busyDays.join(', ')}`,
        impact: 'medium',
        effort: 'high'
      });
    }

    // 4. Alertas inteligentes
    if (noShowRate > 25) {
      insights.alerts.push({
        type: 'critical_no_show',
        title: 'Taxa de Faltas Crítica',
        message: `${noShowRate.toFixed(1)}% dos pacientes não comparecem. Ação imediata necessária.`,
        severity: 'critical'
      });
    }

    if (totalAppointments < 10 && timeRange === '30d') {
      insights.alerts.push({
        type: 'low_data',
        title: 'Dados Insuficientes',
        message: 'Poucos agendamentos nos últimos 30 dias para análise precisa.',
        severity: 'info'
      });
    }

    // Alerta de tendência negativa
    const recentDays = dailyData.slice(-7);
    const recentAvg = recentDays.reduce((sum, day) => sum + day.appointments, 0) / recentDays.length;
    const earlierDays = dailyData.slice(-14, -7);
    const earlierAvg = earlierDays.length > 0 ?
      earlierDays.reduce((sum, day) => sum + day.appointments, 0) / earlierDays.length : recentAvg;

    if (earlierAvg > 0 && (recentAvg / earlierAvg) < 0.7) {
      insights.alerts.push({
        type: 'demand_drop',
        title: 'Queda na Demanda',
        message: 'Agendamentos reduziram 30% na última semana. Verifique fatores externos.',
        severity: 'warning'
      });
    }

    return insights;
  }, [analyticsData]);

  useEffect(() => {
    setInsights(generateInsights);
  }, [generateInsights]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Analytics Inteligente</h2>
            <p className="text-muted-foreground">Insights e previsões baseadas em IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            {[
              { key: '7d', label: '7 dias' },
              { key: '30d', label: '30 dias' },
              { key: '90d', label: '90 dias' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={timeRange === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(key)}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alertas Críticos */}
      {insights.alerts.length > 0 && (
        <div className="space-y-3">
          {insights.alerts.map((alert, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border ${
                alert.severity === 'critical' ? 'border-red-200 bg-red-50 dark:bg-red-900/10' :
                alert.severity === 'warning' ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10' :
                'border-blue-200 bg-blue-50 dark:bg-blue-900/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                  alert.severity === 'critical' ? 'text-red-600' :
                  alert.severity === 'warning' ? 'text-amber-600' :
                  'text-blue-600'
                }`} />
                <div>
                  <h4 className="font-semibold">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Previsão de Demanda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Previsão de Demanda
                  </CardTitle>
                  <CardDescription>
                    Próxima semana baseada em padrões históricos
                  </CardDescription>
                </div>
                {insights.demandPrediction && (
                  <Badge variant={
                    insights.demandPrediction.trend === 'increasing' ? 'default' :
                    insights.demandPrediction.trend === 'decreasing' ? 'destructive' : 'secondary'
                  }>
                    {insights.demandPrediction.trend === 'increasing' ? '↗ Crescente' :
                     insights.demandPrediction.trend === 'decreasing' ? '↘ Decrescente' : '→ Estável'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {insights.demandPrediction ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold">{insights.demandPrediction.predicted}</div>
                      <p className="text-sm text-muted-foreground">agendamentos previstos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Média atual</p>
                      <p className="text-lg font-semibold">{insights.demandPrediction.currentAvg}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Confiança da previsão</span>
                      <span>{insights.demandPrediction.confidence === 'high' ? 'Alta' : 'Média'}</span>
                    </div>
                    <Progress
                      value={insights.demandPrediction.confidence === 'high' ? 85 : 65}
                      className="h-2"
                    />
                  </div>

                  {analyticsData?.dailyData && (
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={analyticsData.dailyData.slice(-14)}>
                        <defs>
                          <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="appointments"
                          stroke={CHART_COLORS.primary}
                          fillOpacity={1}
                          fill="url(#demandGradient)"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="avgAppointments"
                          stroke={CHART_COLORS.secondary}
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                  <BarChart3 className="h-12 w-12 opacity-20" />
                  <div>
                    <p className="font-medium">Dados insuficientes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Precisa de pelo menos 14 dias de dados para previsão
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Padrões Detectados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Padrões Detectados
              </CardTitle>
              <CardDescription>
                Comportamentos identificados nos dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.patterns.length > 0 ? (
                <div className="space-y-4">
                  {insights.patterns.map((pattern, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={`p-2 rounded-full ${
                        pattern.severity === 'high' ? 'bg-red-100 text-red-600' :
                        pattern.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {pattern.type === 'high_no_show' && <AlertTriangle className="h-4 w-4" />}
                        {pattern.type === 'busy_day' && <Calendar className="h-4 w-4" />}
                        {pattern.type === 'peak_hour' && <Clock className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {pattern.type === 'high_no_show' && `${pattern.day}: ${pattern.rate}% de faltas`}
                          {pattern.type === 'busy_day' && `${pattern.day}: ${pattern.total} agendamentos`}
                          {pattern.type === 'peak_hour' && `Pico às ${pattern.hour} (${pattern.appointments} agendamentos)`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pattern.type === 'high_no_show' && 'Considere reforçar lembretes neste dia'}
                          {pattern.type === 'busy_day' && 'Dia com alta demanda'}
                          {pattern.type === 'peak_hour' && 'Horário mais procurado'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                  <Sparkles className="h-12 w-12 opacity-20" />
                  <div>
                    <p className="font-medium">Analisando padrões...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Padrões serão identificados com mais dados
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recomendações de Otimização */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Recomendações IA
              </CardTitle>
              <CardDescription>
                Sugestões para otimizar sua clínica
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {insights.recommendations.map((rec, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">{rec.title}</h4>
                        <div className="flex gap-1">
                          <Badge
                            variant={rec.impact === 'high' ? 'default' : rec.impact === 'medium' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            Impacto: {rec.impact === 'high' ? 'Alto' : rec.impact === 'medium' ? 'Médio' : 'Baixo'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Esforço: {rec.effort === 'high' ? 'Alto' : rec.effort === 'medium' ? 'Médio' : 'Baixo'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <Button variant="ghost" size="sm" className="mt-3 h-8 px-3">
                        <Zap className="h-3 w-3 mr-2" />
                        Implementar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                  <Target className="h-12 w-12 opacity-20" />
                  <div>
                    <p className="font-medium">Sem recomendações pendentes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sua clínica está bem otimizada!
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Métricas Avançadas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Métricas Avançadas
              </CardTitle>
              <CardDescription>
                KPIs detalhados do período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Taxa de Comparecimento por Dia da Semana */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Comparecimento por Dia</h4>
                  <div className="space-y-2">
                    {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, index) => {
                      const stats = analyticsData?.weekdayStats?.[index === 0 ? 1 : index === 6 ? 0 : index + 1];
                      if (!stats || stats.total === 0) return null;

                      const attendanceRate = ((stats.completed / stats.total) * 100);

                      return (
                        <div key={day} className="flex items-center justify-between">
                          <span className="text-sm">{day}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${attendanceRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {attendanceRate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Distribuição de Status */}
                {analyticsData && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Status dos Agendamentos</h4>
                    <ResponsiveContainer width="100%" height={120}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Concluídos', value: analyticsData.totalCompleted, color: CHART_COLORS.success },
                            { name: 'Faltaram', value: analyticsData.totalNoShows, color: CHART_COLORS.danger },
                            { name: 'Cancelados', value: analyticsData.totalCancellations, color: CHART_COLORS.warning }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={45}
                          dataKey="value"
                        >
                          {[
                            { name: 'Concluídos', value: analyticsData.totalCompleted, color: CHART_COLORS.success },
                            { name: 'Faltaram', value: analyticsData.totalNoShows, color: CHART_COLORS.danger },
                            { name: 'Cancelados', value: analyticsData.totalCancellations, color: CHART_COLORS.warning }
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} agendamentos`, '']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsInsights;

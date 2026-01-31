import React, { useEffect, useState } from 'react';
import {
  Users, Calendar, Wrench, TrendingUp,
  Activity, Clock, Bot, UserPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardStats } from '@/database';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '@/lib/utils';

// --- Components for Modern Dashboard ---

import { StatCard } from '@/components/ui/StatCard';

const ChartCard = ({ title, icon: Icon, children, className }) => (
  <Card className={cn("border-none shadow-sm bg-white dark:bg-card overflow-hidden rounded-2xl", className)}>
    <CardHeader className="pb-2 border-b border-slate-50 dark:border-slate-800/50">
      <CardTitle className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 font-sans">
        {Icon && <Icon className="w-4 h-4 text-primary" />} {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-6">
      {children}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const processWeekData = () => {
    if (!stats?.charts?.weekAppointments) return [];
    const counts = {};
    stats.charts.weekAppointments.forEach(app => {
      const date = new Date(app.appointment_date).toLocaleDateString('pt-BR', { weekday: 'short' });
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key.toUpperCase().replace('.', ''),
      consultas: counts[key]
    }));
  };

  const processRepairData = () => {
    if (!stats?.charts?.repairsStatus) return [];
    const counts = {};
    stats.charts.repairsStatus.forEach(r => {
      let name = r.status || 'Indefinido';
      if (name === 'received' || name === 'Pendente') name = 'Pendente';
      if (name === 'sent_to_lab' || name === 'Em andamento') name = 'Andamento';
      if (name === 'ready' || name === 'Concluído') name = 'Pronto';
      if (name === 'returning') name = 'Retornando';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  };

  const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#eab308'];

  if (loading) {
    return (
      <div className="h-full flex flex-col space-y-6 overflow-hidden pr-2">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center py-1">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-12 flex-1">
          <div className="md:col-span-12 lg:col-span-3 flex flex-col gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="flex-1 rounded-3xl" />
          </div>
          <Skeleton className="md:col-span-8 lg:col-span-6 h-[400px] rounded-2xl" />
          <Skeleton className="md:col-span-4 lg:col-span-3 h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto scrollbar-hide pr-2">

      {/* --- HEADER COMPACTO --- */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">
            Visão Geral
          </h1>
          <p className="text-muted-foreground text-sm">Resumo operacional e métricas de hoje.</p>
        </div>
        <div className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* --- BENTO GRID LAYOUT (Refined) --- */}

      {/* Linha 1: Métricas Principais (4 Colunas) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pacientes Hoje"
          value={stats?.metrics?.appointmentsToday || 0}
          subtitle="Agendamentos confirmados"
          icon={Calendar}
          colorClass={{ bg: 'bg-blue-500/5', text: 'text-blue-600', border: 'border-blue-100 dark:border-blue-900/30' }}
          delay={0}
        />
        <StatCard
          title="Base de Pacientes"
          value={stats?.metrics?.totalPatients || 0}
          subtitle="Cadastros ativos"
          icon={Users}
          // PURPLE BAN: Switched to Rose for distinct visual identity without violating the ban
          colorClass={{ bg: 'bg-rose-500/5', text: 'text-rose-600', border: 'border-rose-100 dark:border-rose-900/30' }}
          delay={100}
        />
        <StatCard
          title="Reparos Ativos"
          value={stats?.metrics?.activeRepairs || 0}
          subtitle="Em manutenção"
          icon={Wrench}
          colorClass={{ bg: 'bg-amber-500/5', text: 'text-amber-600', border: 'border-amber-100 dark:border-amber-900/30' }}
          delay={200}
        />
        <StatCard
          title="Interações IA"
          value={stats?.metrics?.claraInteractions || 0}
          subtitle="Respostas automáticas"
          icon={Bot}
          colorClass={{ bg: 'bg-emerald-500/5', text: 'text-emerald-600', border: 'border-emerald-100 dark:border-emerald-900/30' }}
          delay={300}
        />
      </div>

      {/* Linha 2: Comercial & Gráficos (Grid Assimétrico) */}
      <div className="grid gap-4 md:grid-cols-12 flex-1 min-h-[400px]">

        {/* Coluna Esquerda: Métricas Comerciais (3 colunas) */}
        <div className="md:col-span-12 lg:col-span-3 flex flex-col gap-4">
          <StatCard
            title="Leads (24h)"
            value={stats?.metrics?.leads24h || 0}
            subtitle="Novos contatos"
            icon={Clock}
            colorClass={{ bg: 'bg-cyan-500/5', text: 'text-cyan-600', border: 'border-cyan-100 dark:border-cyan-900/30' }}
            delay={400}
          />
          <StatCard
            title="Leads (Mês)"
            value={stats?.metrics?.leadsMonth || 0}
            subtitle="Acumulado"
            icon={UserPlus}
            colorClass={{ bg: 'bg-teal-500/5', text: 'text-teal-600', border: 'border-teal-100 dark:border-teal-900/30' }}
            delay={500}
          />
          <div className="relative overflow-hidden rounded-3xl bg-primary p-6 shadow-xl text-primary-foreground group flex-1 flex flex-col justify-between hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute -top-6 -right-6 p-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
              <DollarSignIcon className="h-40 w-40" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-white/10 w-fit rounded-lg backdrop-blur-sm">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Vendas</span>
              </div>

              <div>
                <div className="text-5xl font-black font-sans tracking-tighter mb-1">
                  {stats?.metrics?.salesMonth || 0}
                </div>
                <p className="text-sm opacity-90 font-medium">
                  Aparelhos auditivos este mês
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Central: Gráfico de Barras (Agenda) (6 colunas) */}
        <ChartCard
          title="Fluxo da Semana"
          icon={Activity}
          className="md:col-span-8 lg:col-span-6 min-h-[350px] border-none shadow-lg shadow-slate-200/50 dark:shadow-none"
        >
          <div className="h-[300px] w-full">
            {processWeekData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processWeekData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    fontWeight={600}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{
                      borderRadius: '16px',
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '16px',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      fontWeight: 500,
                      padding: '12px 16px'
                    }}
                  />
                  <Bar
                    dataKey="consultas"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                    barSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <Calendar className="h-8 w-8 mb-2 opacity-20" />
                Sem agendamentos esta semana.
              </div>
            )}
          </div>
        </ChartCard>

        {/* Coluna Direita: Gráfico de Pizza (Status) (3 colunas) */}
        <ChartCard
          title="Oficina"
          icon={Wrench}
          className="md:col-span-4 lg:col-span-3 min-h-[350px] lg:min-h-0 border-none shadow-lg shadow-slate-200/50 dark:shadow-none"
        >
          <div className="h-[300px] w-full flex items-center justify-center">
            {processRepairData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processRepairData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                  >
                    {processRepairData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-semibold text-slate-500 ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <Wrench className="h-8 w-8 mb-2 opacity-20" />
                Tudo tranquilo.
              </div>
            )}
          </div>
        </ChartCard>

      </div>
    </div>
  );
};

// Ícone auxiliar
const DollarSignIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

export default Dashboard;
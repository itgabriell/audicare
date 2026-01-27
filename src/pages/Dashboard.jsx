import React, { useEffect, useState } from 'react';
import { 
  Users, Calendar, Wrench, TrendingUp, 
  Activity, Clock, Bot, UserPlus 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats } from '@/database';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
        name: key.toUpperCase(),
        consultas: counts[key]
    }));
  };

  const processRepairData = () => {
      if (!stats?.charts?.repairsStatus) return [];
      const counts = {};
      
      stats.charts.repairsStatus.forEach(r => {
          let name = r.status || 'Indefinido';
          // Normaliza status (Português/Inglês)
          if(name === 'received' || name === 'Pendente') name = 'Pendente';
          if(name === 'sent_to_lab' || name === 'Em andamento') name = 'Em andamento';
          if(name === 'ready' || name === 'Concluído') name = 'Pronto';
          if(name === 'returning') name = 'Retornando';
          
          counts[name] = (counts[name] || 0) + 1;
      });

      return Object.keys(counts).map(key => ({
          name: key,
          value: counts[key]
      }));
  };

  const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#eab308'];

  if (loading) {
      return <div className="p-8 flex items-center justify-center h-screen text-muted-foreground animate-pulse">Carregando painel Audicare...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50 min-h-screen">
      
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral e métricas de desempenho.</p>
        </div>
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border shadow-sm">
            📅 {new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}
        </div>
      </div>

      {/* --- LINHA 1: OPERACIONAL (Agenda, Pacientes, Reparos) --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Agenda Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.metrics?.appointmentsToday || 0}</div>
            <p className="text-xs text-muted-foreground">pacientes agendados</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Pacientes</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.metrics?.totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground">base ativa cadastrada</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Reparos Ativos</CardTitle>
            <Wrench className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.metrics?.activeRepairs || 0}</div>
            <p className="text-xs text-muted-foreground">na oficina ou laboratório</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Atendimentos Clara</CardTitle>
            <Bot className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.metrics?.claraInteractions || 0}</div>
            <p className="text-xs text-muted-foreground">interações de IA este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* --- LINHA 2: COMERCIAL (Leads 24h, Mês, Vendas) --- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm bg-white dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Leads (24h)</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.metrics?.leads24h || 0}</div>
            <p className="text-xs text-muted-foreground">novos contatos nas últimas 24h</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-white dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Leads (Mês)</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.metrics?.leadsMonth || 0}</div>
            <p className="text-xs text-muted-foreground">acumulado este mês</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-white dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Vendas (Mês)</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.metrics?.salesMonth || 0}</div>
            <p className="text-xs text-muted-foreground">conversões realizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* --- LINHA 3: GRÁFICOS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Gráfico Agendamentos */}
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500"/> Fluxo da Agenda (Próx. 7 Dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
                {processWeekData().length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={processWeekData()} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                       <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                       <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                       <Tooltip 
                            cursor={{fill: '#f1f5f9'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       />
                       <Bar dataKey="consultas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                     </BarChart>
                   </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                        <Calendar className="h-8 w-8 mb-2 opacity-20" />
                        Sem agendamentos próximos.
                    </div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Reparos */}
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-500"/> Status da Oficina
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {processRepairData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                        <Wrench className="h-8 w-8 mb-2 opacity-20" />
                        Oficina vazia no momento.
                    </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Ícone auxiliar se não importado
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
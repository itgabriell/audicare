import React, { useEffect, useState } from 'react';
import { 
  Users, Calendar, Wrench, TrendingUp, 
  Activity, ArrowUpRight, DollarSign 
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
        // Não mostramos toast de erro no dashboard para não assustar no login, 
        // apenas logamos, a menos que seja crítico.
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  // Processamento dos dados para os gráficos
  const processWeekData = () => {
    if (!stats?.charts?.weekAppointments) return [];
    
    // Agrupa por dia
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
          // Traduz status para nome amigável
          let name = r.status;
          if(name === 'received') name = 'Na Clínica';
          if(name === 'sent_to_lab') name = 'No Lab';
          if(name === 'ready') name = 'Pronto';
          if(name === 'returning') name = 'Voltando';
          
          counts[name] = (counts[name] || 0) + 1;
      });

      return Object.keys(counts).map(key => ({
          name: key,
          value: counts[key]
      }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
      return <div className="p-8 flex items-center justify-center h-screen text-muted-foreground">Carregando painel...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50 min-h-screen">
      
      {/* Cabelhado */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral da Audicare hoje.</p>
        </div>
        <div className="text-sm text-muted-foreground bg-white dark:bg-slate-800 px-3 py-1 rounded-full border shadow-sm">
            📅 {new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}
        </div>
      </div>

      {/* Cards de Métricas (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Agenda Hoje */}
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agenda Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.metrics?.appointmentsToday || 0}</div>
            <p className="text-xs text-muted-foreground">pacientes agendados</p>
          </CardContent>
        </Card>

        {/* Card 2: Reparos Ativos */}
        <Card className="shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reparos na Oficina</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.metrics?.activeRepairs || 0}</div>
            <p className="text-xs text-muted-foreground">aparelhos em processo</p>
          </CardContent>
        </Card>

        {/* Card 3: Vendas Mês */}
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas (Mês)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.metrics?.salesMonth || 0}</div>
            <p className="text-xs text-muted-foreground">leads convertidos</p>
          </CardContent>
        </Card>

        {/* Card 4: Total Pacientes */}
        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.metrics?.totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground">base ativa cadastrada</p>
          </CardContent>
        </Card>
      </div>

      {/* Área de Gráficos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Gráfico Principal: Agendamentos */}
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500"/> Fluxo da Agenda (Próx. Dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
                {processWeekData().length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={processWeekData()}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                       <XAxis 
                            dataKey="name" 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                       <YAxis 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `${value}`} 
                        />
                       <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       />
                       <Bar dataKey="consultas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                     </BarChart>
                   </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sem agendamentos previstos para esta semana.
                    </div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Secundário: Reparos */}
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
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Nenhum aparelho em reparo no momento.
                    </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
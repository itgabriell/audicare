import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DraggableKanbanBoard from '@/components/tasks/DraggableKanbanBoard';
import TaskDialog from '@/components/tasks/TaskDialog';
import { useToast } from '@/components/ui/use-toast';
import { getTasks, addTask, updateTask, deleteTask, getTeamMembers } from '@/database';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from 'lucide-react';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);

  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  const { toast } = useToast();
  const { user } = useAuth();

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Tasks] Erro ao carregar tarefas', error);
      toast({
        title: 'Erro ao carregar tarefas',
        description:
          error?.message ||
          'Ocorreu um erro ao buscar as tarefas. Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTasks();
    loadTeamMembers();
  }, [loadTasks]);

  const loadTeamMembers = useCallback(async () => {
    try {
      const members = await getTeamMembers();
      setTeamMembers(members || []);
    } catch (error) {
      // Erro não crítico - apenas loga se necessário
      if (error?.code !== 'PGRST116') { // PGRST116 = no rows returned, não é erro
        console.warn('[Tasks] Aviso ao carregar membros da equipe:', error?.message || 'Erro desconhecido');
      }
      setTeamMembers([]);
    }
  }, []);

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        const updatedTask = await updateTask(editingTask.id, taskData);
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? updatedTask : t)),
        );
        toast({ title: 'Sucesso!', description: 'Tarefa atualizada.' });
      } else {
        const payload = {
          ...taskData,
          status: 'todo',
          assignee_id: taskData.assignee_id || user?.id || null,
        };
        const addedTask = await addTask(payload, user?.id);
        setTasks((prev) => [addedTask, ...prev]);
        toast({ title: 'Sucesso!', description: 'Nova tarefa criada.' });
      }
      setDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('[Tasks] Erro ao salvar tarefa', error);
      toast({
        title: 'Erro ao salvar tarefa',
        description:
          error?.message ||
          'Ocorreu um erro ao salvar a tarefa. Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    { id: 'todo', title: 'A Fazer' },
    { id: 'doing', title: 'Em Andamento' },
    { id: 'done', title: 'Concluído' },
  ];

  const filteredTasks = useMemo(() => {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10); // yyyy-mm-dd

    return tasks.filter((task) => {
      if (assigneeFilter !== 'all' && task.assignee_id !== assigneeFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && task.category !== categoryFilter) {
        return false;
      }
      if (overdueOnly) {
        if (!task.due_date || task.status === 'done') return false;
        return task.due_date < todayISO;
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(searchLower);
        const matchesDescription = task.description?.toLowerCase().includes(searchLower);
        const matchesCategory = task.category?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDescription && !matchesCategory) return false;
      }
      return true;
    });
  }, [tasks, assigneeFilter, priorityFilter, categoryFilter, overdueOnly, searchTerm]);

  // Métricas
  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const overdue = filteredTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length;
    const dueToday = filteredTasks.filter(t => t.due_date === today && t.status !== 'done').length;

    return {
      total: filteredTasks.length,
      done: filteredTasks.filter(t => t.status === 'done').length,
      inProgress: filteredTasks.filter(t => t.status === 'doing').length,
      todo: filteredTasks.filter(t => t.status === 'todo').length,
      overdue,
      dueToday,
      highPriority: filteredTasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
    };
  }, [filteredTasks]);

  const handleTaskMove = async (task, newStatus) => {
    const originalTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t,
      ),
    );
    try {
      await updateTask(task.id, { status: newStatus });
      toast({
        title: 'Tarefa movida',
        description: `Status alterado para ${newStatus === 'todo' ? 'A Fazer' : newStatus === 'doing' ? 'Em Andamento' : 'Concluído'}`
      });
    } catch (error) {
      console.error('[Tasks] Erro ao mover tarefa', error);
      setTasks(originalTasks);
      toast({
        title: 'Erro ao mover tarefa',
        description:
          error?.message ||
          'Não foi possível mover a tarefa. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId) => {
    const originalTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteTask(taskId);
      toast({ title: 'Sucesso!', description: 'Tarefa removida.' });
    } catch (error) {
      console.error('[Tasks] Erro ao remover tarefa', error);
      setTasks(originalTasks);
      toast({
        title: 'Erro ao remover tarefa',
        description:
          error?.message ||
          'Ocorreu um erro ao remover a tarefa. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleAddTask = (status) => {
    setEditingTask(null);
    setDialogOpen(true);
    // Could pre-set status here if needed
  };

  // Categorias únicas para filtro
  const categories = useMemo(() => {
    const cats = new Set();
    tasks.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [tasks]);

  return (
    <>
      <Helmet>
        <title>Tarefas - Audicare</title>
        <meta name="description" content="Gerenciamento de tarefas internas" />
      </Helmet>

      <div className="h-full flex flex-col space-y-4 overflow-hidden pr-1 relative">
        {/* Modern Floating Header & Controls */}
        <div className="flex flex-col gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                Tarefas Internas
              </h1>
              <p className="text-muted-foreground text-sm">
                Organize as atividades da equipe
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingTask(null);
                setDialogOpen(true);
              }}
              className="rounded-2xl h-11 px-5 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col lg:flex-row gap-3 items-center w-full">
            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 rounded-2xl transition-all shadow-sm"
              />
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-2 w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl h-10 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    Responsável: <span className="text-slate-900 dark:text-slate-200 ml-1 font-medium">{assigneeFilter === 'all' ? 'Todos' : (teamMembers.find(m => m.id === assigneeFilter)?.full_name || 'Meu usuário')}</span>
                    <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                    {teamMembers.map((member) => (
                      <DropdownMenuRadioItem key={member.id} value={member.id}>{member.full_name || member.email}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl h-10 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    Prioridade: <span className="text-slate-900 dark:text-slate-200 ml-1 font-medium">{priorityFilter === 'all' ? 'Todas' : (priorityFilter === 'high' ? 'Alta' : priorityFilter === 'medium' ? 'Média' : 'Baixa')}</span>
                    <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup value={priorityFilter} onValueChange={setPriorityFilter}>
                    <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="high">Alta</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="medium">Média</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="low">Baixa</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {categories.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-xl h-10 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      Categoria: <span className="text-slate-900 dark:text-slate-200 ml-1 font-medium">{categoryFilter === 'all' ? 'Todas' : categoryFilter}</span>
                      <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                      <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
                      {categories.map((cat) => (
                        <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="flex items-center gap-2 ml-auto px-2">
                <input
                  id="overdueOnly"
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                  className="h-4 w-4 rounded-lg border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                />
                <label
                  htmlFor="overdueOnly"
                  className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                >
                  Atrasadas
                </label>
              </div>
            </div>
          </div>

          {/* Mini Metrics Bar - Horizontal Scroll */}
          <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
            <div className="min-w-[120px] bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/50 flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</p>
              <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{metrics.total}</p>
            </div>
            <div className="min-w-[120px] bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/30 flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">A Fazer</p>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{metrics.todo}</p>
            </div>
            <div className="min-w-[120px] bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl p-3 border border-amber-100 dark:border-amber-900/30 flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Andamento</p>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{metrics.inProgress}</p>
            </div>
            <div className="min-w-[120px] bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Concluídas</p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{metrics.done}</p>
            </div>
            <div className="min-w-[120px] bg-red-50/50 dark:bg-red-900/10 rounded-2xl p-3 border border-red-100 dark:border-red-900/30 flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Atrasadas</p>
              <p className="text-2xl font-black text-red-700 dark:text-red-300">{metrics.overdue}</p>
            </div>
            <div className="min-w-[120px] bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl p-3 border border-orange-100 dark:border-orange-900/30 flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold text-orange-500 tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Hoje</p>
              <p className="text-2xl font-black text-orange-700 dark:text-orange-300">{metrics.dueToday}</p>
            </div>
            <div className="min-w-[120px] bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl p-3 border border-rose-100 dark:border-rose-900/30 flex flex-col justify-between">
              <p className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Alta Prior.</p>
              <p className="text-2xl font-black text-rose-700 dark:text-rose-300">{metrics.highPriority}</p>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto scrollbar-thin pb-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <DraggableKanbanBoard
              tasks={filteredTasks}
              onTaskMove={handleTaskMove}
              onTaskClick={handleEditTask}
              onTaskEdit={handleEditTask}
              onTaskDelete={handleDeleteTask}
              onAddTask={handleAddTask}
            />
          )}
        </div>

        <TaskDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingTask(null);
          }}
          onSave={handleSaveTask}
          task={editingTask}
        />
      </div>
    </>
  );
};

export default Tasks;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TaskColumn from '@/components/tasks/TaskColumn';
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

  const handleUpdateStatus = async (taskId, newStatus) => {
    const originalTasks = [...tasks];
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task,
      ),
    );
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('[Tasks] Erro ao atualizar status', error);
      setTasks(originalTasks);
      toast({
        title: 'Erro ao atualizar status',
        description:
          error?.message ||
          'Não foi possível atualizar o status da tarefa. Tente novamente.',
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

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Tarefas Internas
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Organize as atividades da equipe
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingTask(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-card border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-foreground mt-1">{metrics.total}</p>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">A Fazer</p>
            <p className="text-xl font-bold text-foreground mt-1">{metrics.todo}</p>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Em Andamento</p>
            <p className="text-xl font-bold text-foreground mt-1">{metrics.inProgress}</p>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Concluídas</p>
                <p className="text-xl font-bold text-foreground">{metrics.done}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
                <p className="text-xl font-bold text-foreground">{metrics.overdue}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Vencem Hoje</p>
                <p className="text-xl font-bold text-foreground">{metrics.dueToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Alta Prioridade</p>
            <p className="text-xl font-bold text-foreground mt-1">{metrics.highPriority}</p>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="bg-card border rounded-lg p-3 flex flex-col gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-normal text-muted-foreground gap-1 px-2">
                  Responsável: <span className="text-foreground font-medium">
                    {assigneeFilter === 'all' ? 'Todos' : (teamMembers.find(m => m.id === assigneeFilter)?.full_name || 'Meu usuário')}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  {teamMembers.map((member) => (
                    <DropdownMenuRadioItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-normal text-muted-foreground gap-1 px-2">
                  Prioridade: <span className="text-foreground font-medium">
                    {priorityFilter === 'all' ? 'Todas' : (priorityFilter === 'high' ? 'Alta' : priorityFilter === 'medium' ? 'Média' : 'Baixa')}
                  </span>
                  <ChevronDown className="h-4 w-4" />
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
                  <Button variant="ghost" className="text-sm font-normal text-muted-foreground gap-1 px-2">
                    Categoria: <span className="text-foreground font-medium">
                      {categoryFilter === 'all' ? 'Todas' : categoryFilter}
                    </span>
                    <ChevronDown className="h-4 w-4" />
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

            <div className="flex items-center gap-2 ml-auto">
              <input
                id="overdueOnly"
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="h-4 w-4"
              />
              <label
                htmlFor="overdueOnly"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Apenas atrasadas
              </label>
            </div>
          </div>
        </div>

        {/* Board */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => (
              <TaskColumn
                key={column.id}
                column={column}
                tasks={filteredTasks.filter(
                  (task) => task.status === column.id,
                )}
                onUpdateTask={handleUpdateStatus}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
        )}

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
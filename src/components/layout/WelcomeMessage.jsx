import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sun, Calendar, Wrench, CheckSquare } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const WelcomeMessage = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, repairs: 0, tasks: 0 });

  useEffect(() => {
    const checkAndShow = async () => {
      // Ensure we only show once per session
      const hasSeen = sessionStorage.getItem('hasSeenWelcome');
      if (!hasSeen && user) {
        
        // Fetch quick stats for the popup
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const [appointmentsRes, repairsRes, tasksRes] = await Promise.all([
                supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('appointment_date', today),
                supabase.from('repairs').select('*', { count: 'exact', head: true }).neq('status', 'delivered'),
                supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'completed')
            ]);

            setStats({
                appointments: appointmentsRes.count || 0,
                repairs: repairsRes.count || 0,
                tasks: tasksRes.count || 0
            });
            
             setOpen(true);
        } catch (e) {
            console.error("Error fetching welcome stats", e);
            setOpen(true); // Show anyway with 0s
        }
      }
    };
    checkAndShow();
  }, [user]);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem('hasSeenWelcome', 'true');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-none shadow-2xl">
        {/* Floating Icon Header */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#307351] rounded-full p-3 border-4 border-white dark:border-slate-900 shadow-lg z-50">
             <Sun className="h-8 w-8 text-white" />
        </div>
        
        <DialogHeader className="pt-10 text-center space-y-2">
          <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Um ótimo dia para você!
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Aqui estão seus destaques para começar bem o dia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-6">
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Consultas agendadas</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{stats.appointments}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reparos em aberto</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{stats.repairs}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <CheckSquare className="h-5 w-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tarefas pendentes</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{stats.tasks}</span>
            </div>
        </div>

        <DialogFooter>
          <Button 
            className="w-full bg-[#307351] hover:bg-[#265c40] text-white h-12 text-base font-medium shadow-sm transition-colors"
            onClick={handleClose}
          >
            Começar o dia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeMessage;
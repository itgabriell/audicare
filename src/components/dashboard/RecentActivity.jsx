import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

const RecentActivity = () => {
  const activities = [
    { id: 1, text: 'Novo paciente cadastrado', time: 'Há 5 minutos' },
    { id: 2, text: 'Consulta agendada', time: 'Há 15 minutos' },
    { id: 3, text: 'Atendimento finalizado', time: 'Há 1 hora' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card rounded-xl shadow-sm border p-6"
    >
      <h2 className="text-lg font-semibold text-foreground mb-4">Atividades Recentes</h2>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-3 bg-background rounded-lg">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{activity.text}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentActivity;
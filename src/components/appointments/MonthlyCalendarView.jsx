import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/contexts/ThemeContext';

const MonthlyCalendarView = ({
  currentDate,
  appointments,
  onDayClick,
  onAppointmentClick
}) => {
  const { theme } = useTheme();

  // Calcular o intervalo do mês incluindo semanas parciais
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(() =>
    eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  // Agrupar agendamentos por dia
  const appointmentsByDay = useMemo(() => {
    const map = new Map();

    appointments.forEach(appointment => {
      if (!appointment.start_time && !appointment.appointment_date) return;

      const appointmentDate = new Date(appointment.start_time || appointment.appointment_date);
      const dayKey = format(appointmentDate, 'yyyy-MM-dd');

      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey).push(appointment);
    });

    return map;
  }, [appointments]);

  const getDayAppointments = (day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    return appointmentsByDay.get(dayKey) || [];
  };

  const getAppointmentStyle = (appointment) => {
    const baseClasses = "text-xs p-2 rounded hover:opacity-80 transition-opacity cursor-pointer border-l-2 overflow-hidden shadow-sm";

    // Cores adaptáveis ao tema
    const statusColors = {
      confirmed: theme === 'dark' ? 'bg-green-700 text-white border-green-600' : 'bg-green-600 text-white border-green-500',
      arrived: theme === 'dark' ? 'bg-blue-700 text-white border-blue-600' : 'bg-blue-600 text-white border-blue-500',
      completed: theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-600 text-white border-gray-500',
      no_show: theme === 'dark' ? 'bg-red-700 text-white border-red-600' : 'bg-red-600 text-white border-red-500',
      cancelled: theme === 'dark' ? 'bg-gray-600 text-white border-gray-500' : 'bg-gray-500 text-white border-gray-400',
      rescheduled: theme === 'dark' ? 'bg-yellow-700 text-white border-yellow-600' : 'bg-yellow-600 text-white border-yellow-500',
      not_confirmed: theme === 'dark' ? 'bg-orange-700 text-white border-orange-600' : 'bg-orange-600 text-white border-orange-500',
      scheduled: theme === 'dark' ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-600 text-white border-slate-500'
    };

    const colorClass = statusColors[appointment.status] || statusColors.scheduled;

    return `${baseClasses} ${colorClass}`;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'arrived': return 'Chegou';
      case 'completed': return 'Concluído';
      case 'no_show': return 'Não Compareceu';
      case 'cancelled': return 'Cancelado';
      case 'rescheduled': return 'Reagendado';
      case 'not_confirmed': return 'Não Confirmado';
      default: return 'Agendado';
    }
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 bg-muted/50">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
          <div key={index} className="p-3 text-center text-sm font-medium text-muted-foreground border-b">
            {day}
          </div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayAppointments = getDayAppointments(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          return (
            <div
              key={index}
              className={`min-h-[120px] p-2 border-b border-r cursor-pointer hover:bg-muted/30 transition-colors ${
                !isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''
              } ${isTodayDate ? 'bg-primary/5' : ''}`}
              onClick={() => onDayClick(day)}
            >
              {/* Número do dia */}
              <div className={`text-sm font-medium mb-2 ${
                isTodayDate ? 'text-primary font-bold' : ''
              }`}>
                {format(day, 'd')}
              </div>

              {/* Agendamentos do dia */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((appointment, appIndex) => (
                  <div
                    key={appointment.id}
                    className={getAppointmentStyle(appointment)}
                    title={`${appointment.contact?.name || 'Paciente'} - ${appointment.title || appointment.appointment_type} - ${getStatusLabel(appointment.status)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(appointment);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold">
                        {format(new Date(appointment.start_time || appointment.appointment_date), 'HH:mm')}
                      </div>
                      <div className="text-xs opacity-90 font-medium">
                        {getStatusLabel(appointment.status)}
                      </div>
                    </div>
                    <div className="truncate font-semibold mb-1">
                      {appointment.contact?.name || 'Paciente'}
                    </div>
                    <div className="truncate text-xs opacity-90 font-medium">
                      {appointment.title || appointment.appointment_type}
                    </div>
                  </div>
                ))}

                {/* Indicador de mais agendamentos */}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{dayAppointments.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda de status */}
      <div className="p-4 border-t bg-muted/20">
        <h4 className="text-sm font-medium mb-2">Legenda de Status:</h4>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary"></div>
            <span>Agendado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>Confirmado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>Chegou</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-500"></div>
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Não Compareceu</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span>Não Confirmado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span>Reagendado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-400"></div>
            <span>Cancelado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyCalendarView;

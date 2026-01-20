import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MonthlyCalendarView = ({
  currentDate,
  appointments,
  onDayClick,
  onAppointmentClick
}) => {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'arrived': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'no_show': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-400';
      case 'rescheduled': return 'bg-yellow-500';
      case 'not_confirmed': return 'bg-orange-500';
      default: return 'bg-primary';
    }
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
                    className={`text-xs p-2 rounded text-white hover:opacity-80 transition-opacity cursor-pointer border-l-2 overflow-hidden ${getStatusColor(appointment.status)}`}
                    title={`${appointment.contact?.name || 'Paciente'}: ${appointment.title || appointment.appointment_type} - ${getStatusLabel(appointment.status)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(appointment);
                    }}
                  >
                    <div className="font-bold">
                      {format(new Date(appointment.start_time || appointment.appointment_date), 'HH:mm')}
                    </div>
                    <div className="truncate font-medium">
                      {appointment.contact?.name || 'Paciente'}
                    </div>
                    <div className="truncate text-xs opacity-90">
                      {appointment.title || appointment.appointment_type}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {getStatusLabel(appointment.status)}
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

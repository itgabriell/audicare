import React, { useMemo, memo } from 'react';
import { format, startOfWeek, addDays, isToday as isTodayFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight, GripVertical, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useChatNavigation } from '@/hooks/useChatNavigation';

const DraggableAppointment = memo(({ appointment, onAppointmentClick }) => {
  const { theme } = useTheme();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: appointment.id,
    data: {
      type: 'appointment',
      appointment,
    },
  });

  const { navigateToChat, loading: chatLoading } = useChatNavigation();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return theme === 'dark' ? 'bg-green-700' : 'bg-green-500';
      case 'arrived': return theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500';
      case 'completed': return theme === 'dark' ? 'bg-gray-700' : 'bg-gray-500';
      case 'no_show': return theme === 'dark' ? 'bg-red-700' : 'bg-red-500';
      case 'cancelled': return theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400';
      case 'rescheduled': return theme === 'dark' ? 'bg-yellow-700' : 'bg-yellow-500';
      case 'not_confirmed': return theme === 'dark' ? 'bg-orange-700' : 'bg-orange-500';
      default: return theme === 'dark' ? 'bg-slate-700' : 'bg-primary';
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`${getStatusColor(appointment.status)}/20 text-primary-foreground p-2 rounded-md text-xs mb-1 hover:bg-opacity-30 transition-colors group cursor-move border-l-4 ${getStatusColor(appointment.status)} overflow-hidden`}
    >
      <div className="flex items-start gap-1 min-w-0">
        <GripVertical
          {...listeners}
          className="h-3 w-3 text-primary/60 group-hover:text-primary/80 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        />
        <div
          className="flex-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onAppointmentClick(appointment);
          }}
        >
          {/* Horário */}
          <p className="font-bold text-white text-xs">
            {(() => {
              const date = new Date(appointment.start_time || appointment.appointment_date);
              // Exibir exatamente a hora cadastrada, sem conversões de timezone
              return date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
            })()}
          </p>

          {/* Nome do paciente */}
          <p className="font-semibold text-primary truncate">{appointment.contact?.name || 'Paciente'}</p>

          {/* Tipo de consulta (Badge) */}
          <div className="mt-0.5">
            <span className="inline-block px-1.5 py-0.5 rounded-[3px] bg-background/20 text-[10px] font-medium uppercase tracking-wider leading-none">
              {appointment.appointment_type || appointment.title || 'Consulta'}
            </span>
          </div>

          {/* Botão de Chat (Absolute or Inline) - Using inline for better layout control */}
          {appointment.contact?.phone && (
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div
                role="button"
                className={`p-1 rounded-full bg-white/20 hover:bg-green-500/80 text-white ${chatLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToChat({
                    name: appointment.contact?.name,
                    phone: appointment.contact?.phone
                  });
                }}
                title="Abrir Conversa"
              >
                <MessageCircle className="w-3 h-3" />
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-1 mt-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(appointment.status)}`}></div>
            <span className="text-xs text-primary/70 truncate">{getStatusLabel(appointment.status)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

const DroppableTimeSlot = memo(({
  date,
  time,
  appointments,
  onSlotClick,
  onAppointmentClick
}) => {
  const timeHour = parseInt(time.split(':')[0]);

  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: `${date.toDateString()}_${timeHour}`,
    data: {
      type: 'slot',
      date,
      time,
      timeHour,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border-l border-b p-1 min-h-[120px] cursor-pointer transition-colors ${isOver ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
        }`}
      onClick={() => onSlotClick(date, time)}
    >
      <SortableContext
        items={appointments.map(app => app.id)}
        strategy={verticalListSortingStrategy}
      >
        {appointments.map(app => (
          <DraggableAppointment
            key={`${app.id}-${app.status}`}
            appointment={app}
            onAppointmentClick={onAppointmentClick}
          />
        ))}
      </SortableContext>
    </div>
  );
});

const DraggableAppointmentCalendar = ({
  currentDate,
  appointments,
  onSlotClick,
  onAppointmentClick,
  onAppointmentMove,
  onDateChange // NEW PROP
}) => {
  const [activeId, setActiveId] = React.useState(null);
  const [activeAppointment, setActiveAppointment] = React.useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const timeSlots = useMemo(() =>
    Array.from({ length: 11 }, (_, i) => `${i + 8}:00`), // 8:00 to 18:00
    []
  );

  const weekDates = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: ptBR, weekStartsOn: 1 }); // Start on Monday
    return Array.from({ length: 6 }, (_, i) => addDays(start, i)); // 6 days: Mon-Sat
  }, [currentDate]);

  // CORREÇÃO DE FUSO HORÁRIO: Memoizar todos os agendamentos por slot de uma vez
  // Forçar criação de objetos Date para garantir conversão UTC para Local
  const appointmentsBySlot = useMemo(() => {
    const map = new Map();
    appointments.forEach(app => {
      // O 'new Date()' converte automaticamente o ISO (UTC) para o Horário do Navegador (Local)
      const appDate = new Date(app.start_time || app.appointment_date);
      const dateKey = appDate.toDateString();
      const hour = appDate.getHours();
      const slotKey = `${dateKey}_${hour}`;

      if (!map.has(slotKey)) {
        map.set(slotKey, []);
      }
      map.get(slotKey).push(app);
    });
    return map;
  }, [appointments]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    const appointment = appointments.find(app => app.id === event.active.id);
    setActiveAppointment(appointment);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveAppointment(null);

    if (!over) return;

    const activeAppointment = appointments.find(app => app.id === active.id);
    if (!activeAppointment) return;

    // If dropped on another appointment, find its slot
    let targetSlot = over.data.current;
    if (over.data.current?.type === 'appointment') {
      const targetAppointment = appointments.find(app => app.id === over.id);
      if (targetAppointment) {
        const targetDate = new Date(targetAppointment.start_time || targetAppointment.appointment_date);
        targetSlot = {
          type: 'slot',
          date: targetDate,
          time: `${targetDate.getHours()}:00`,
          timeHour: targetDate.getHours(),
        };
      }
    }

    if (!targetSlot || targetSlot.type !== 'slot') return;

    // Calculate new date/time
    const newDate = new Date(targetSlot.date);
    newDate.setHours(targetSlot.timeHour, 0, 0, 0);

    // Check if it's a different time slot
    const currentDate = new Date(activeAppointment.start_time || activeAppointment.appointment_date);
    const isDifferentSlot = currentDate.getTime() !== newDate.getTime();

    if (isDifferentSlot && onAppointmentMove) {
      onAppointmentMove(activeAppointment, newDate);
    }
  };

  const handleDragOver = (event) => {
    // Custom collision detection for time slots
    const { active, over } = event;

    if (!over) return;

    // If hovering over an appointment, redirect to its slot
    if (over.data.current?.type === 'appointment') {
      const targetAppointment = appointments.find(app => app.id === over.id);
      if (targetAppointment) {
        const targetDate = new Date(targetAppointment.start_time || targetAppointment.appointment_date);
        const slotId = `${targetDate.toDateString()}_${targetDate.getHours()}`;

        // Find the slot element and trigger hover
        const slotElement = document.querySelector(`[data-sortable-id="${slotId}"]`);
        if (slotElement) {
          // This will trigger the visual feedback
        }
      }
    }
  };

  // Helper for navigation
  const navigateWeek = (direction) => {
    if (onDateChange) {
      onDateChange(addDays(currentDate, direction * 7));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-slate-900 sticky left-0 z-20">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)} title="Semana Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg capitalize min-w-[150px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)} title="Próxima Semana">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Could add a Today button or other controls here */}
      </div>

      <div className="overflow-x-auto bg-card rounded-lg border">
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: '60px repeat(6, 1fr)' }}
        >
          {/* Time column header */}
          <div className="sticky left-0 bg-card z-10 p-2"></div>

          {/* Day headers */}
          {weekDates.map((date, index) => (
            <div key={index} className="text-center p-2 border-b border-l">
              <p className="text-sm font-medium text-muted-foreground capitalize">
                {format(date, 'EEE', { locale: ptBR })}
              </p>
              <p className={`font-semibold text-2xl mt-1 ${isTodayFns(date) ? 'text-primary' : 'text-foreground'
                }`}>
                {format(date, 'd')}
              </p>
            </div>
          ))}

          {/* Time slots and appointments */}
          {timeSlots.map(time => {
            const timeHour = parseInt(time.split(':')[0]);
            return (
              <React.Fragment key={time}>
                <div className="p-2 border-b text-sm text-muted-foreground text-right sticky left-0 bg-card z-10 min-h-[120px] flex items-center justify-end pr-4">
                  {time}
                </div>
                {weekDates.map((date, dayIndex) => {
                  const slotKey = `${date.toDateString()}_${timeHour}`;
                  const appointmentsForSlot = appointmentsBySlot.get(slotKey) || [];

                  return (
                    <DroppableTimeSlot
                      key={dayIndex}
                      date={date}
                      time={time}
                      appointments={appointmentsForSlot}
                      onSlotClick={onSlotClick}
                      onAppointmentClick={onAppointmentClick}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAppointment ? (
          <div className="bg-primary/20 text-primary-foreground p-2 rounded-md text-xs shadow-lg rotate-3">
            <p className="font-semibold">{activeAppointment.contact?.name || 'Paciente'}</p>
            <p className="text-primary/80">{activeAppointment.title || activeAppointment.appointment_type}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default memo(DraggableAppointmentCalendar);

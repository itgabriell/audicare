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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const DraggableAppointment = memo(({ appointment, onAppointmentClick }) => {
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-primary/10 text-primary-foreground p-1.5 rounded-md text-xs mb-1 hover:bg-primary/20 transition-colors group cursor-move"
    >
      <div className="flex items-start gap-1">
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
          <p className="font-semibold text-primary truncate">{appointment.contact?.name || 'Paciente'}</p>
          <p className="text-primary/80 truncate">{appointment.appointment_type}</p>
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
      className={`border-l border-b p-1 h-24 overflow-y-auto cursor-pointer transition-colors ${
        isOver ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
      }`}
      onClick={() => onSlotClick(date, time)}
    >
      <SortableContext
        items={appointments.map(app => app.id)}
        strategy={verticalListSortingStrategy}
      >
        {appointments.map(app => (
          <DraggableAppointment
            key={app.id}
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
  onAppointmentMove
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
    const start = startOfWeek(currentDate, { locale: ptBR });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Memoizar todos os agendamentos por slot de uma vez
  const appointmentsBySlot = useMemo(() => {
    const map = new Map();
    appointments.forEach(app => {
      const appDate = new Date(app.appointment_date);
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
        const targetDate = new Date(targetAppointment.appointment_date);
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
    const currentDate = new Date(activeAppointment.appointment_date);
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
        const targetDate = new Date(targetAppointment.appointment_date);
        const slotId = `${targetDate.toDateString()}_${targetDate.getHours()}`;

        // Find the slot element and trigger hover
        const slotElement = document.querySelector(`[data-sortable-id="${slotId}"]`);
        if (slotElement) {
          // This will trigger the visual feedback
        }
      }
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
      <div className="overflow-x-auto bg-card rounded-lg border">
        <div className="grid grid-cols-[auto_repeat(7,1fr)] min-w-[900px]">
          {/* Time column header */}
          <div className="sticky left-0 bg-card z-10 p-2"></div>

          {/* Day headers */}
          {weekDates.map((date, index) => (
            <div key={index} className="text-center p-2 border-b border-l">
              <p className="text-sm font-medium text-muted-foreground capitalize">
                {format(date, 'EEE', { locale: ptBR })}
              </p>
              <p className={`font-semibold text-2xl mt-1 ${
                isTodayFns(date) ? 'text-primary' : 'text-foreground'
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
                <div className="p-2 border-b text-sm text-muted-foreground text-right sticky left-0 bg-card z-10 h-24 flex items-center justify-end pr-4">
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
            <p className="text-primary/80">{activeAppointment.appointment_type}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default memo(DraggableAppointmentCalendar);

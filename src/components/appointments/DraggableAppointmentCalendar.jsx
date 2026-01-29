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
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ... existing code ...

const DraggableAppointmentCalendar = ({
  currentDate,
  appointments,
  onSlotClick,
  onAppointmentClick,
  onAppointmentMove,
  onDateChange // NEW PROP
}) => {
  // ... existing code ...

  const handleDragOver = (event) => {
    // ... existing code ...
  };

  // NEW: Helper for navigation
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
      {/* NEW: Navigation Header within component if not controlled externally fully */}
      {/* However, the Dialog in ChatIntegration shows "Hoje" button externally. */}
      {/* Let's add arrows next to the dates or as a header row. */}

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
        <div className="grid grid-cols-[auto_repeat(7,1fr)] min-w-[900px]">
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
          {/* ... existing rendering ... */}

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

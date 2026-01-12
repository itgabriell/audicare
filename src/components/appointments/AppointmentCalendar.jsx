import React, { useMemo, memo } from 'react';
import { format, startOfWeek, addDays, isToday as isTodayFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AppointmentCalendar = ({ currentDate, appointments, onSlotClick, onAppointmentClick }) => {
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

    return (
        <div className="overflow-x-auto bg-card rounded-lg border">
            <div className="grid grid-cols-[auto_repeat(7,1fr)] min-w-[900px]">
                {/* Time column header */}
                <div className="sticky left-0 bg-card z-10 p-2"></div>

                {/* Day headers */}
                {weekDates.map((date, index) => (
                    <div key={index} className="text-center p-2 border-b border-l">
                        <p className="text-sm font-medium text-muted-foreground capitalize">{format(date, 'EEE', { locale: ptBR })}</p>
                        <p className={`font-semibold text-2xl mt-1 ${isTodayFns(date) ? 'text-primary' : 'text-foreground'}`}>{format(date, 'd')}</p>
                    </div>
                ))}

                {/* Time slots and appointments */}
                {timeSlots.map(time => {
                    const timeHour = parseInt(time.split(':')[0]);
                    return (
                        <React.Fragment key={time}>
                            <div className="p-2 border-b text-sm text-muted-foreground text-right sticky left-0 bg-card z-10 h-24 flex items-center justify-end pr-4">{time}</div>
                            {weekDates.map((date, dayIndex) => {
                                const slotKey = `${date.toDateString()}_${timeHour}`;
                                const appointmentsForSlot = appointmentsBySlot.get(slotKey) || [];

                                return (
                                    <div 
                                        key={dayIndex} 
                                        className="border-l border-b p-1 h-24 overflow-y-auto cursor-pointer hover:bg-muted/50 transition-colors" 
                                        onClick={() => onSlotClick(date, time)}
                                    >
                                        {appointmentsForSlot.map(app => (
                                            <div 
                                                key={app.id} 
                                                className="bg-primary/10 text-primary-foreground p-1.5 rounded-md text-xs mb-1 hover:bg-primary/20 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); onAppointmentClick(app); }}
                                            >
                                                <p className="font-semibold text-primary truncate">{app.patients?.name || 'Paciente'}</p>
                                                <p className="text-primary/80 truncate">{app.appointment_type}</p>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default memo(AppointmentCalendar);
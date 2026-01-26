import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User,
  Home // Ícone para Domiciliar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AppointmentCalendar = ({ 
  appointments, 
  onDateClick, 
  onEventClick, 
  onEventDrop,
  onViewChange 
}) => {
  const calendarRef = React.useRef(null);
  const [currentView, setCurrentView] = useState('timeGridDay'); // Padrão: DIA
  const [currentDate, setCurrentDate] = useState(new Date());

  // Atualiza o título da data
  const dateTitle = React.useMemo(() => {
    if (currentView === 'dayGridMonth') {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    }
    if (currentView === 'timeGridDay') {
      return format(currentDate, "dd 'de' MMMM", { locale: ptBR });
    }
    return 'Agenda';
  }, [currentDate, currentView]);

  const handlePrev = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.prev();
    setCurrentDate(calendarApi.getDate());
  };

  const handleNext = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.next();
    setCurrentDate(calendarApi.getDate());
  };

  const handleToday = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.today();
    setCurrentDate(calendarApi.getDate());
  };

  const changeView = (view) => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.changeView(view);
    setCurrentView(view);
    if (onViewChange) onViewChange(view);
  };

  // --- RENDERIZAÇÃO CUSTOMIZADA DO EVENTO ---
  const renderEventContent = (eventInfo) => {
    const { event } = eventInfo;
    const isDomiciliar = event.extendedProps.type === 'domiciliar' || event.extendedProps.location?.toLowerCase().includes('domiciliar');
    
    // Design Box Arredondado Melhorado
    return (
      <div className={`flex flex-col h-full w-full p-1.5 rounded-md border-l-4 overflow-hidden shadow-sm transition-all hover:shadow-md ${
        isDomiciliar 
          ? 'bg-blue-50 border-blue-500 text-blue-900' // Estilo Domiciliar
          : 'bg-card border-primary/60 text-card-foreground' // Estilo Padrão
      }`}>
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="font-bold text-xs truncate flex-1">
            {event.title}
          </span>
          {isDomiciliar && (
            <div className="bg-blue-200 text-blue-800 p-0.5 rounded flex items-center justify-center" title="Atendimento Domiciliar">
               <Home className="h-3 w-3" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-[10px] opacity-90">
          <Clock className="h-2.5 w-2.5" />
          <span className="truncate">
            {eventInfo.timeText}
          </span>
        </div>

        {event.extendedProps.professional && (
           <div className="flex items-center gap-1 text-[10px] opacity-80 mt-auto pt-1">
             <User className="h-2.5 w-2.5" />
             <span className="truncate">{event.extendedProps.professional}</span>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border shadow-sm overflow-hidden">
      {/* Header do Calendário */}
      <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Controles de Navegação */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-card p-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday} className="px-3 text-xs font-medium">
              Hoje
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold capitalize ml-2 min-w-[140px]">
            {dateTitle}
          </h2>
        </div>

        {/* Filtros de Visualização (Ordem Invertida: Dia - Semana - Mês) */}
        <div className="flex bg-muted p-1 rounded-lg">
          <Button
            variant={currentView === 'timeGridDay' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeView('timeGridDay')}
            className="text-xs"
          >
            Dia
          </Button>
          <Button
            variant={currentView === 'timeGridWeek' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeView('timeGridWeek')}
            className="text-xs"
          >
            Semana
          </Button>
          <Button
            variant={currentView === 'dayGridMonth' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeView('dayGridMonth')}
            className="text-xs"
          >
            Mês
          </Button>
        </div>
      </div>

      {/* Corpo do Calendário */}
      <div className="flex-1 p-0 overflow-auto calendar-container">
        <style>{`
          .fc { --fc-border-color: hsl(var(--border)); }
          .fc .fc-col-header-cell { background-color: hsl(var(--muted)/0.5); padding: 8px 0; }
          .fc-theme-standard td, .fc-theme-standard th { border-color: hsl(var(--border)); }
          .fc-timegrid-slot { height: 3rem; } /* Altura maior para os slots */
          .fc-event { border: none !important; background: transparent !important; box-shadow: none !important; }
        `}</style>
        
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="timeGridDay" // Inicia no DIA
          locale={ptBrLocale}
          headerToolbar={false}
          events={appointments}
          dateClick={onDateClick}
          eventClick={onEventClick}
          eventDrop={onEventDrop}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          height="100%"
          expandRows={true}
          stickyHeaderDates={true}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            hour12: false
          }}
          eventContent={renderEventContent}
        />
      </div>
    </div>
  );
};

export default AppointmentCalendar;
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
  Home, // Ícone para Domiciliar
  MessageCircle, // Ícone chat
  CheckCircle2, // Confirmado
  Check, // Chegou
  Clock as ClockIcon
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
  const [currentView, setCurrentView] = useState('listDay'); // Padrão: DIA
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Force view on mount to ensure listDay is active
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      if (api.view.type !== 'listDay') {
        api.changeView('listDay');
      }
    }
  }, []);

  // Atualiza o título da data
  const dateTitle = React.useMemo(() => {
    if (currentView === 'dayGridMonth') {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    }
    if (currentView === 'listDay' || currentView === 'timeGridDay') {
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
    const status = event.extendedProps.status || 'scheduled';
    const patientName = event.title;
    const patientPhone = event.extendedProps.contact_phone || event.extendedProps.patient_phone; // Assumindo que backend manda isso
    const contactId = event.extendedProps.contact_id || event.extendedProps.patient_id;

    // Cores por Status
    const statusColors = {
      scheduled: 'bg-card border-l-4 border-l-primary/60',
      confirmed: 'bg-green-50 border-l-4 border-l-green-500',
      arrived: 'bg-blue-50 border-l-4 border-l-blue-600', // "Chegou" - Destaque Azul/Verde
      completed: 'bg-slate-100 border-l-4 border-l-slate-400 opacity-80',
      cancelled: 'bg-red-50 border-l-4 border-l-red-400 opacity-60',
      no_show: 'bg-red-100 border-l-4 border-l-red-600',
    };

    const baseClass = statusColors[status] || statusColors.scheduled;

    // Se for domiciliar, sobrescreve ou adiciona indicador visual extra?
    // Vamos manter status como cor principal e domiciliar com ícone/badge

    return (
      <div className={`flex flex-col h-full w-full p-1.5 rounded-md overflow-hidden shadow-sm transition-all hover:shadow-md group relative ${baseClass} ${isDomiciliar ? 'bg-amber-50/50' : ''}`}>

        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="font-bold text-xs truncate flex-1 leading-tight">
            {patientName}
          </span>

          <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
            {/* Botão Chatwoot no Card */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Garante que não abre edit dialog
                // Navegar para chat integration
                // Precisamos do telefone ou ID. Se não tiver telefone no prop, tentamos pelo contactId
                let url = `/chat-integration?leadId=${contactId}`;
                if (patientPhone) url += `&phone=${patientPhone}&name=${encodeURIComponent(patientName)}`;
                else url += `&name=${encodeURIComponent(patientName)}`; // Fallback nome
                window.location.href = url;
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-green-200 rounded text-green-700"
              title="Enviar mensagem"
            >
              <MessageCircle className="h-3 w-3" />
            </button>

            {status === 'arrived' && <Check className="h-3 w-3 text-blue-600" />}
            {status === 'confirmed' && <CheckCircle2 className="h-3 w-3 text-green-600" />}

            {isDomiciliar && (
              <div className="bg-amber-200 text-amber-800 p-0.5 rounded flex items-center justify-center" title="Atendimento Domiciliar">
                <Home className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] opacity-90">
          <ClockIcon className="h-2.5 w-2.5" />
          <span className="truncate font-medium">
            {eventInfo.timeText}
          </span>
          {/* Status Label Pequeno */}
          <span className="ml-auto text-[8px] uppercase tracking-wide opacity-70">
            {status === 'scheduled' ? '' : status === 'arrived' ? 'Chegou' : status}
          </span>
        </div>

        {event.extendedProps.professional && (
          <div className="flex items-center gap-1 text-[9px] opacity-70 mt-auto pt-0.5">
            <User className="h-2 w-2" />
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
            variant={currentView === 'listDay' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => changeView('listDay')}
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
          initialView="listDay" // Inicia no DIA (Lista)
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
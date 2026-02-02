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
  Clock as ClockIcon,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AppointmentCalendar = ({
  appointments,
  onDateClick,
  onEventClick,
  onEventDrop,
  onViewChange
}) => {
  const calendarRef = React.useRef(null);
  const [currentView, setCurrentView] = useState('listDay'); // Padrão: DIA (Lista Customizada)
  const [currentDate, setCurrentDate] = useState(new Date());

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
    const newDate = new Date(currentDate);
    if (currentView === 'dayGridMonth') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (currentView === 'timeGridWeek') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);

    // Sync FullCalendar se estiver visível
    if (calendarRef.current && currentView !== 'listDay') {
      calendarRef.current.getApi().gotoDate(newDate);
    }
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'dayGridMonth') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (currentView === 'timeGridWeek') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);

    // Sync FullCalendar se estiver visível
    if (calendarRef.current && currentView !== 'listDay') {
      calendarRef.current.getApi().gotoDate(newDate);
    }
  };

  const handleToday = () => {
    const newDate = new Date();
    setCurrentDate(newDate);
    if (calendarRef.current && currentView !== 'listDay') {
      calendarRef.current.getApi().today();
    }
  };

  const changeView = (view) => {
    setCurrentView(view);
    // Se mudar para uma view de calendário, garante o sync
    if (view !== 'listDay') {
      setTimeout(() => {
        if (calendarRef.current) {
          const api = calendarRef.current.getApi();
          api.changeView(view);
          api.gotoDate(currentDate);
        }
      }, 0);
    }
    if (onViewChange) onViewChange(view);
  };

  // --- RENDERIZAÇÃO DO CARD (Componente Reutilizável) ---
  const EventCard = ({ event, onClick }) => {
    // Adapter for FullCalendar event object structure vs Raw object
    const isRaw = !event.extendedProps;

    const extendedProps = isRaw ? event : event.extendedProps;
    const title = isRaw ? event.title : event.title;
    const start = isRaw ? new Date(event.start) : event.start;

    const type = extendedProps.type || '';
    const location = extendedProps.location || '';

    const isDomiciliar = type === 'domiciliar' || location?.toLowerCase().includes('domiciliar');
    const status = extendedProps.status || 'scheduled';
    const patientName = title;
    const patientPhone = extendedProps.contact_phone || extendedProps.patient_phone;
    const contactId = extendedProps.contact_id || extendedProps.patient_id;
    const professional = extendedProps.professional_name || extendedProps.professional;

    const statusColors = {
      scheduled: 'bg-card border-l-4 border-l-primary/60',
      confirmed: 'bg-green-50 border-l-4 border-l-green-500',
      arrived: 'bg-blue-50 border-l-4 border-l-blue-600',
      completed: 'bg-slate-100 border-l-4 border-l-slate-400 opacity-80',
      cancelled: 'bg-red-50 border-l-4 border-l-red-400 opacity-60',
      no_show: 'bg-red-100 border-l-4 border-l-red-600',
    };

    const baseClass = statusColors[status] || statusColors.scheduled;
    const timeText = format(start, 'HH:mm');

    return (
      <div
        onClick={(e) => onClick && onClick({ event: isRaw ? { ...event, extendedProps: event, start: start } : event })}
        className={`flex flex-col w-full p-3 rounded-lg border shadow-sm transition-all hover:shadow-md group relative cursor-pointer ${baseClass} ${isDomiciliar ? 'bg-amber-50/50' : ''}`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-bold text-sm truncate flex-1 leading-tight text-foreground">
            {patientName}
          </span>

          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                let url = `/chat-integration?leadId=${contactId}`;
                if (patientPhone) url += `&phone=${patientPhone}&name=${encodeURIComponent(patientName)}`;
                else url += `&name=${encodeURIComponent(patientName)}`;
                window.location.href = url;
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-green-200 rounded text-green-700"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            {status === 'arrived' && <Check className="h-4 w-4 text-blue-600" />}
            {status === 'confirmed' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {isDomiciliar && (
              <div className="bg-amber-200 text-amber-800 p-0.5 rounded px-1 text-[10px] uppercase font-bold" title="Domiciliar">
                DOM
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ClockIcon className="h-3 w-3" />
          <span className="font-medium">{timeText}</span>
          <span className="ml-auto text-[10px] uppercase tracking-wide font-semibold opacity-80">
            {status === 'scheduled' ? 'Agendado' : status === 'arrived' ? 'Chegou' : status === 'confirmed' ? 'Confirmado' : status}
          </span>
        </div>

        {professional && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-2 pt-2 border-t border-black/5">
            <User className="h-3 w-3" />
            <span className="truncate">{professional}</span>
          </div>
        )}
      </div>
    );
  };

  const renderEventContent = (eventInfo) => {
    return <EventCard event={eventInfo.event} />;
  };

  // Dados da Lista Customizada (Ordenados por hora)
  const todaysAppointments = appointments
    .filter(app => isSameDay(new Date(app.start), currentDate))
    .sort((a, b) => new Date(a.start) - new Date(b.start));

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

        {/* Filtros de Visualização */}
        <div className="flex bg-muted p-1 rounded-lg items-center gap-1">
          {/* Toggle Lista/Cards (Apenas visível se estiver em visão de DIA) */}
          {(currentView === 'listDay' || currentView === 'timeGridDay') && (
            <div className="flex border-r mr-2 pr-2 gap-1">
              <Button
                variant={currentView === 'listDay' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => changeView('listDay')}
                title="Lista (Feed)"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={currentView === 'timeGridDay' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => changeView('timeGridDay')}
                title="Cards (Grade)"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            variant={(currentView === 'listDay' || currentView === 'timeGridDay') ? 'default' : 'ghost'}
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
      <div className="flex-1 p-0 overflow-auto calendar-container bg-slate-50/50 dark:bg-slate-950/50">
        <style>{`
          .fc { --fc-border-color: hsl(var(--border)); }
          .fc .fc-col-header-cell { background-color: hsl(var(--muted)/0.5); padding: 8px 0; }
          .fc-timegrid-slot { height: 3rem; }
          .fc-event { border: none !important; background: transparent !important; box-shadow: none !important; }
        `}</style>

        {currentView === 'listDay' ? (
          <div className="p-4 flex flex-col gap-3 max-w-2xl mx-auto">
            {todaysAppointments.length > 0 ? (
              todaysAppointments.map((app) => (
                <EventCard key={app.id} event={app} onClick={onEventClick} />
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>Sem agendamentos para este dia.</p>
              </div>
            )}
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView === 'timeGridDay' ? 'timeGridDay' : currentView}
            // initialView deve reagir ao currentView exceto quando é custom list
            // Mas quando é custom list, não renderizamos o FullCalendar.
            // Então aqui renderizamos apenas se !listDay.
            // Mas se for semana/mês, currentView muda.
            // Então initialView aqui só importa na primeira render do FC.
            // O useEffect ou changeView já trata sync.
            // Vamos garantir que se renderizar, renderiza certo.
            initialDate={currentDate}
            locale={ptBrLocale}
            headerToolbar={false}
            events={appointments}
            dateClick={onDateClick}
            eventClick={onEventClick}
            eventDrop={onEventDrop}
            editable={true}
            selectable={true}
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
        )}
      </div>
    </div>
  );
};

export default AppointmentCalendar;
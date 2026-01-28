import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useNavigate } from 'react-router-dom';
import { Home, ExternalLink } from 'lucide-react';

const MonthlyCalendarView = ({
  currentDate,
  appointments,
  onDayClick,
  onAppointmentClick
}) => {
  const calendarRef = React.useRef(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(currentDate);
    }
  }, [currentDate]);

  // Navegação segura para o paciente
  const handleNavigate = (e, patientId) => {
    e.stopPropagation(); // Evita abrir o modal de edição
    e.preventDefault();
    if (patientId) {
      navigate(`/patients/${patientId}`);
    }
  };

  // Renderização customizada do evento
  const renderEventContent = (eventInfo) => {
    const { event } = eventInfo;
    const isDomiciliar = event.extendedProps.type === 'domiciliar' || event.extendedProps.location?.toLowerCase().includes('domiciliar');
    const patientName = event.extendedProps.contact_name || event.title;
    const patientId = event.extendedProps.contact_id || event.extendedProps.patient_id;

    return (
      <div className={`
        flex flex-col w-full px-1 py-0.5 rounded text-[10px] leading-tight overflow-hidden
        ${isDomiciliar ? 'bg-blue-100 text-blue-800 border-l-2 border-blue-500' : 'bg-primary/10 text-foreground border-l-2 border-primary'}
      `}>
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold">{eventInfo.timeText}</span>
          {isDomiciliar && <Home className="h-2 w-2" />}
        </div>

        {/* Nome Clicável */}
        <div
          className="truncate font-medium hover:underline hover:text-primary cursor-pointer flex items-center gap-0.5 mt-0.5 z-20"
          onPointerDown={(e) => e.stopPropagation()} // Importante para FullCalendar
          onClick={(e) => handleNavigate(e, patientId)}
          title="Ir para ficha"
        >
          {patientName}
          {patientId && <ExternalLink className="h-2 w-2 opacity-50" />}
        </div>

        {/* TIPO (Adicionado) */}
        <div className="text-[9px] opacity-80 uppercase tracking-tight truncate mt-0.5">
          {event.extendedProps.type || 'Consulta'}
        </div>
      </div>
    );
  };

  // Mapeia agendamentos para formato do FullCalendar
  const events = appointments.map(app => ({
    id: app.id,
    title: app.contact?.name || app.title || 'Consulta',
    start: app.start_time,
    end: app.end_time,
    extendedProps: {
      type: app.appointment_type,
      location: app.location,
      contact_name: app.contact?.name || app.contact_name || 'Paciente',
      contact_id: app.contact?.id || app.contact_id || app.patient_id,
      patient_id: app.patient_id
    }
  }));

  return (
    <div className="h-[600px] calendar-monthly-view">
      <style>{`
            .fc-event { background: transparent !important; border: none !important; box-shadow: none !important; }
            .fc-daygrid-day-frame { cursor: pointer; }
            .fc-daygrid-day:hover { background-color: hsl(var(--muted)/0.3); }
            
            /* Fix Borders for Dark Mode */
            .fc-theme-standard td, .fc-theme-standard th { border-color: hsl(var(--border)) !important; }
            .fc-theme-standard .fc-scrollgrid { border-color: hsl(var(--border)) !important; }
            .fc-col-header-cell { background-color: hsl(var(--muted)/0.5); }
        `}</style>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        headerToolbar={false}
        events={events}
        dateClick={(info) => onDayClick && onDayClick(info.date)}
        eventClick={(info) => {
          // Ao clicar no evento (fora do nome), abre o modal
          const originalApp = appointments.find(a => a.id === info.event.id);
          if (originalApp && onAppointmentClick) {
            onAppointmentClick(originalApp);
          }
        }}
        eventContent={renderEventContent}
        dayMaxEvents={3}
        height="100%"
      />
    </div>
  );
};

export default MonthlyCalendarView;
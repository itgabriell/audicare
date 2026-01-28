import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useNavigate } from 'react-router-dom';
import { Home, ExternalLink, Calendar as CalendarIcon, Ear, Stethoscope, BriefcaseMedical } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const MonthlyCalendarView = ({
  currentDate,
  appointments,
  onDayClick,
  onAppointmentClick
}) => {
  const calendarRef = useRef(null);
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(currentDate);
    }
  }, [currentDate]);

  // --- CORES & ÍCONES POR TIPO ---
  const getTypeConfig = (type) => {
    const rawType = (type || '').toLowerCase();

    if (rawType.includes('domiciliar')) {
      return {
        bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-600 dark:text-blue-400',
        icon: Home, label: 'Domiciliar'
      };
    }
    if (rawType.includes('molde')) {
      return {
        bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-600 dark:text-purple-400',
        icon: Ear, label: 'Molde'
      };
    }
    if (rawType.includes('aparelho')) {
      return {
        bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-600 dark:text-orange-400',
        icon: BriefcaseMedical, label: 'Aparelho'
      };
    }
    if (rawType.includes('exame') || rawType.includes('audiometria')) {
      return {
        bg: 'bg-rose-500/10', border: 'border-rose-500/50', text: 'text-rose-600 dark:text-rose-400',
        icon: Stethoscope, label: 'Exame'
      };
    }
    // Default
    return {
      bg: 'bg-primary/10', border: 'border-primary/50', text: 'text-primary',
      icon: CalendarIcon, label: type || 'Consulta'
    };
  };

  // Navegação segura para o paciente
  const handleNavigate = (e, patientId) => {
    e.stopPropagation();
    e.preventDefault();
    if (patientId) {
      navigate(`/patients/${patientId}`);
    }
  };

  // Renderização customizada do evento "Card Premium"
  const renderEventContent = (eventInfo) => {
    const { event } = eventInfo;
    const type = event.extendedProps.type;
    const location = event.extendedProps.location;
    const patientName = event.extendedProps.contact_name || event.title;
    const patientId = event.extendedProps.contact_id || event.extendedProps.patient_id;

    // Determina estilo baseado no tipo combinado (type + location)
    const config = getTypeConfig(location?.includes('domiciliar') ? 'domiciliar' : type);
    const Icon = config.icon;

    return (
      <div className={`
        flex flex-col w-full p-1.5 rounded-md border-l-4 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer overflow-hidden
        ${config.bg} ${config.border}
      `}>
        {/* Cabeçalho: Hora e Ícone */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={`text-[10px] font-bold ${config.text}`}>
            {eventInfo.timeText}
          </span>
          <Icon className={`w-3 h-3 ${config.text} opacity-70`} />
        </div>

        {/* Nome do Paciente (Maior e mais legível) */}
        <div
          className="text-xs font-semibold text-foreground truncate hover:text-primary hover:underline"
          title={patientName}
          onPointerDown={(e) => e.stopPropagation()} // Importante para FullCalendar
          onClick={(e) => handleNavigate(e, patientId)}
        >
          {patientName}
        </div>

        {/* Badge do Tipo */}
        <div className={`text-[9px] font-medium uppercase tracking-wider mt-1 opacity-80 truncate ${config.text}`}>
          {config.label}
        </div>
      </div>
    );
  };

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
    <div className="h-[750px] calendar-monthly-view bg-card rounded-xl border shadow-sm p-4">
      <style>{`
            /* Remove estilos padrão feios do FullCalendar */
            .fc-theme-standard td, .fc-theme-standard th { 
                border-color: hsl(var(--border)); 
            }
            .fc-scrollgrid { 
                border: none !important; 
            }
            .fc-col-header-cell {
                padding: 12px 0;
                background-color: hsl(var(--muted)/0.3);
                border-bottom: 1px solid hsl(var(--border)) !important;
            }
            .fc-col-header-cell-cushion {
                font-size: 0.85rem;
                font-weight: 600;
                color: hsl(var(--muted-foreground));
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .fc-daygrid-day-number {
                font-size: 0.9rem;
                font-weight: 500;
                color: hsl(var(--muted-foreground));
                padding: 8px !important;
            }
            .fc-daygrid-day:hover {
                background-color: hsl(var(--muted)/0.2);
            }
            .fc-day-today {
                background-color: hsl(var(--primary)/0.05) !important;
            }
            .fc-event { 
                background: transparent !important; 
                border: none !important; 
                box-shadow: none !important; 
                margin-top: 4px !important;
                margin-bottom: 4px !important;
            }
            .fc-daygrid-day-bottom {
                font-size: 0.75rem;
                padding: 4px;
            }
            .fc-more-popover {
                background-color: hsl(var(--popover));
                border: 1px solid hsl(var(--border));
                border-radius: 0.5rem;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }
            .fc-popover-header {
                background-color: hsl(var(--muted)/0.5);
                border-bottom: 1px solid hsl(var(--border));
                padding: 8px 12px;
                font-weight: 600;
            }
            .fc-popover-body {
                padding: 8px;
            }
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
          const originalApp = appointments.find(a => a.id === info.event.id);
          if (originalApp && onAppointmentClick) {
            onAppointmentClick(originalApp);
          }
        }}
        eventContent={renderEventContent}
        dayMaxEvents={3} // Limite de eventos visíveis por dia
        moreLinkContent={(args) => `+${args.num} consultar`}
        moreLinkClassNames="text-xs font-medium text-primary hover:underline block text-center py-1 bg-primary/5 rounded-md mt-1 cursor-pointer"
        height="100%"
        dayHeaderFormat={{ weekday: 'long' }} // Nome completo do dia
        fixedWeekCount={false} // Evita linhas vazias no final do mês
      />
    </div>
  );
};

export default MonthlyCalendarView;
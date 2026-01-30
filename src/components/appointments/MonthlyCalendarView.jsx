import React, { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useNavigate } from 'react-router-dom';
import { Home, ExternalLink, Calendar as CalendarIcon, Ear, Stethoscope, BriefcaseMedical, MessageSquare } from 'lucide-react';
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

  // Helper para navegar p/ Chat
  const handleChat = (e, leadId, phone, name, email) => {
    e.stopPropagation();
    const params = new URLSearchParams();

    const cleanPhone = (phone || '').replace(/\D/g, '');
    params.append('phone', cleanPhone);
    params.append('name', name || 'Visitante');
    if (email) params.append('email', email); // Envia apenas se existir

    if (leadId) params.append('leadId', leadId);
    navigate(`/inbox?${params.toString()}`);
  };

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
        bg: 'bg-slate-500/10', border: 'border-slate-500/50', text: 'text-slate-600 dark:text-slate-400',
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
    const patientPhone = event.extendedProps.contact_phone || event.extendedProps.patient_phone;
    const patientEmail = event.extendedProps.contact_email; // Recuperando email
    const contactId = event.extendedProps.contact_id; // ID do contato/lead
    const status = event.extendedProps.status || 'scheduled';

    const statusLabels = {
      scheduled: 'Agendado',
      confirmed: 'Confirmado',
      arrived: 'Chegou',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      no_show: 'Não Compareceu'
    };

    // Determina estilo baseado no tipo combinado (type + location)
    const config = getTypeConfig(location?.includes('domiciliar') ? 'domiciliar' : type);
    const Icon = config.icon;

    return (
      <div className={`
        flex flex-row items-center gap-2 w-full p-1.5 px-2 rounded-lg border shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer overflow-hidden
        ${config.bg} ${config.border}
      `}>
        {/* Dot Indicator */}
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.text.replace('text-', 'bg-')}`} />

        <div className="flex-1 min-w-0 flex flex-col leading-none gap-0.5">
          <div className="flex justify-between items-center w-full">
            <span className={`text-[10px] font-bold ${config.text}`}>
              {eventInfo.timeText}
            </span>
            <span className={`text-[8px] uppercase tracking-wider font-bold opacity-80 ${config.text} border border-current px-1 rounded-[4px]`}>
              {type === 'domiciliar' || location?.includes('domiciliar') ? 'DOM' : type?.slice(0, 3)}
            </span>
          </div>

          <span
            className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate hover:text-primary transition-colors"
            title={patientName}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => handleNavigate(e, patientId)}
          >
            {patientName}
          </span>

          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[9px] text-muted-foreground opacity-90 truncate">
              {statusLabels[status] || status}
            </span>
            {/* Botão Chat */}
            <div
              role="button"
              onClick={(e) => handleChat(e, contactId, patientPhone, patientName, patientEmail)}
              className="p-0.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400 transition-colors"
              title="Enviar mensagem"
            >
              <MessageSquare className="w-3 h-3" />
            </div>
          </div>
        </div>

        <Icon className={`w-3 h-3 ${config.text} opacity-50 flex-shrink-0`} />
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
      patient_id: app.patient_id,
      contact_phone: app.contact?.phone || app.patient_phone,
      contact_email: app.contact?.email, // Adicionado Email
      status: app.status
    }
  }));

  return (
    <div className="h-full calendar-monthly-view bg-white dark:bg-card rounded-2xl p-4 overflow-hidden flex flex-col">
      <style>{`
            .fc-theme-standard td, .fc-theme-standard th { 
                border-color: rgba(226, 232, 240, 0.6); 
            }
            .dark .fc-theme-standard td, .dark .fc-theme-standard th { 
                border-color: rgba(30, 41, 59, 0.6); 
            }
            .fc-scrollgrid { 
                border: none !important; 
            }
            .fc-col-header-cell {
                padding: 16px 0;
                background-color: transparent;
                border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
            }
            .dark .fc-col-header-cell {
                border-bottom: 1px solid rgba(30, 41, 59, 0.8) !important;
            }
            .fc-col-header-cell-cushion {
                font-size: 0.75rem;
                font-weight: 700;
                color: hsl(var(--primary));
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }
            .fc-daygrid-day-number {
                font-size: 0.85rem;
                font-weight: 600;
                color: hsl(var(--muted-foreground));
                padding: 8px 12px !important;
            }
            .fc-daygrid-day:hover {
                background-color: hsl(var(--muted)/0.3);
            }
            .fc-day-today {
                background-color: hsl(var(--primary)/0.03) !important;
            }
            .fc-event { 
                background: transparent !important; 
                border: none !important; 
                box-shadow: none !important; 
                margin-top: 2px !important;
                margin-bottom: 2px !important;
            }
            .fc-daygrid-day-bottom {
                font-size: 0.75rem;
            }
            .fc-popover {
                background-color: hsl(var(--popover)) !important;
                border: 1px solid hsl(var(--border)) !important;
                border-radius: 1rem !important;
                box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
                overflow: hidden;
            }
            .fc-popover-header {
                background-color: hsl(var(--muted)/0.3) !important;
                padding: 12px 16px !important;
                font-weight: 700 !important;
            }
            .fc-popover-body {
                padding: 12px !important;
            }
        `}</style>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
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
          dayMaxEvents={3}
          moreLinkContent={(args) => `+ ${args.num} mais`}
          moreLinkClassNames="text-xs font-bold text-primary hover:text-primary-foreground hover:bg-primary transition-colors block text-center py-1 rounded-md mt-1 cursor-pointer mx-1"
          contentHeight="auto"
          height="auto"
          dayHeaderFormat={{ weekday: 'long' }}
          fixedWeekCount={false}
        />
      </div>
    </div>
  );
};

export default MonthlyCalendarView;
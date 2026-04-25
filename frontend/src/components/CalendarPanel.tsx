import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { ca } from 'date-fns/locale/ca';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-styles.css'; // Estils personalitzats per al mode fosc

const locales = { 'ca': ca };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

const CalendarPanel: React.FC = () => {
  const { data: events } = useSWR(`${API_BASE}/calendar/events`, fetcher);
  const navigate = useNavigate();

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#4f46e5'; // indigo-600 per defecte
    const title = event.title.toLowerCase();
    
    if (title.includes('trucada')) backgroundColor = '#4f46e5'; // indigo
    if (title.includes('reunio')) backgroundColor = '#059669';  // emerald
    if (title.includes('visita')) backgroundColor = '#b45309';  // amber
    
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '2px 5px'
      }
    };
  };

  const handleSelectEvent = (event: any) => {
    if (event.resource?.deal_id) {
      navigate(`/deals/${event.resource.deal_id}`);
    }
  };

  const formattedEvents = Array.isArray(events) ? events.map((e: any) => ({
    ...e,
    start: e.start ? new Date(e.start) : new Date(),
    end: e.end ? new Date(e.end) : (e.start ? new Date(new Date(e.start).getTime() + 3600000) : new Date())
  })) : [];

  return (
    <div className="h-full bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
        <h3 className="font-bold text-slate-900 dark:text-white">Calendari de Gestió</h3>
      </div>
      <div className="h-[calc(100%-2rem)]">
        <Calendar
          localizer={localizer}
          events={formattedEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          culture="ca"
          views={['month', 'week', 'day']}
          defaultView="month"
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          messages={{
            next: "Següent",
            previous: "Anterior",
            today: "Avui",
            month: "Mes",
            week: "Setmana",
            day: "Dia"
          }}
        />
      </div>
    </div>
  );
};

export default CalendarPanel;

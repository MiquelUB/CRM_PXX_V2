import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { ca } from 'date-fns/locale/ca';
import useSWR from 'swr';
import { Plus, Trash2, X, Check, Loader2, CalendarRange } from 'lucide-react';
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

const toLocalISOString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const CalendarPanel: React.FC = () => {
  const { data: events, mutate: mutateEvents } = useSWR(`${API_BASE}/calendar/events`, fetcher);
  const { data: deals } = useSWR(`${API_BASE}/deals`, fetcher);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<any>(null); // null if creating, event if editing
  const [dealId, setDealId] = React.useState('');
  const [tipus, setTipus] = React.useState('seguiment');
  const [contingut, setContingut] = React.useState('');
  const [dataInici, setDataInici] = React.useState('');
  const [dataFi, setDataFi] = React.useState('');
  const [esTasca, setEsTasca] = React.useState(true);
  const [completat, setCompletat] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const activeDeals = Array.isArray(deals) ? deals : [];

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#4f46e5'; // indigo-600 per defecte
    const title = event.title.toLowerCase();
    
    if (title.includes('trucada')) backgroundColor = '#4f46e5'; // indigo
    if (title.includes('reunio')) backgroundColor = '#059669';  // emerald
    if (title.includes('visita')) backgroundColor = '#b45309';  // amber
    if (title.includes('demo')) backgroundColor = '#7c3aed';    // violet
    
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
    setSelectedEvent(event);
    setDealId(event.resource?.deal_id?.toString() || '');
    setTipus(event.resource?.tipus || 'seguiment');
    // Extreu la descripció neta llevant la referència al municipi si hi és "(Municipi)"
    const cleanTitle = event.title.replace(/\s\([^)]+\)$/, '');
    setContingut(cleanTitle);
    setDataInici(toLocalISOString(new Date(event.start)));
    setDataFi(toLocalISOString(new Date(event.end)));
    setEsTasca(event.resource?.es_tasca ?? true);
    setCompletat(event.resource?.completat ?? false);
    setShowDeleteConfirm(false);
    setIsModalOpen(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedEvent(null);
    setDealId('');
    setTipus('seguiment');
    setContingut('');
    setDataInici(toLocalISOString(start));
    // Afegir 30 min per defecte si start i end coincideixen
    const actualEnd = start.getTime() === end.getTime() ? new Date(start.getTime() + 1800000) : end;
    setDataFi(toLocalISOString(actualEnd));
    setEsTasca(true);
    setCompletat(false);
    setShowDeleteConfirm(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealId) return alert('Has de seleccionar un Municipi / Deal.');

    setIsSubmitting(true);
    try {
      if (selectedEvent) {
        // Mode Edició: PATCH /accions/{id}
        const res = await fetch(`${API_BASE}/accions/${selectedEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descripcio: contingut,
            tipus,
            data_inici: new Date(dataInici).toISOString(),
            data_fi: new Date(dataFi).toISOString(),
            es_tasca: esTasca,
            completat
          })
        });
        if (!res.ok) throw new Error('Error al modificar l\'acció');
      } else {
        // Mode Creació: POST /deals/{deal_id}/accions
        const res = await fetch(`${API_BASE}/deals/${dealId}/accions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipus,
            contingut,
            data_programada: new Date(dataInici).toISOString(),
            data_fi: new Date(dataFi).toISOString(),
            es_tasca: esTasca
          })
        });
        if (!res.ok) throw new Error('Error al crear l\'acció');
      }
      setIsModalOpen(false);
      mutateEvents();
    } catch (err) {
      console.error(err);
      alert('Error en guardar l\'esdeveniment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/accions/${selectedEvent.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar l\'acció');
      setIsModalOpen(false);
      mutateEvents();
    } catch (err) {
      console.error(err);
      alert('Error en eliminar l\'esdeveniment.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedEvents = Array.isArray(events) ? events.map((e: any) => ({
    ...e,
    start: e.start ? new Date(e.start) : new Date(),
    end: e.end ? new Date(e.end) : (e.start ? new Date(new Date(e.start).getTime() + 3600000) : new Date())
  })) : [];

  return (
    <div className="h-full bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
          <h3 className="font-bold text-slate-900 dark:text-white">Calendari de Gestió</h3>
        </div>
        <button
          onClick={() => handleSelectSlot({ start: new Date(), end: new Date() })}
          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
        >
          <Plus size={14} />
          Nou
        </button>
      </div>

      <div className="flex-1 min-h-0">
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
          selectable={true}
          onSelectSlot={handleSelectSlot}
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

      {/* MODAL DE CREACIÓ / EDICIÓ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100 dark:border-slate-900">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <CalendarRange size={16} className="text-indigo-600" />
                {selectedEvent ? 'Editar Esdeveniment' : 'Nou Esdeveniment'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {showDeleteConfirm ? (
              <div className="space-y-6 py-4 text-center">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Confirmar Eliminació</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aquesta acció és permanent i no es pot desfer.</p>
                </div>
                <div className="flex justify-center gap-3">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Cancel·lar
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 justify-center"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Eliminar'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                {/* Selecció de Deal / Municipi */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Municipi / Projecte</label>
                  {selectedEvent ? (
                    <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-900 rounded-xl px-4 py-2 text-sm text-slate-500 font-medium">
                      {activeDeals.find(d => d.id.toString() === dealId)?.municipi?.nom || 'Deal Associat'}
                    </div>
                  ) : (
                    <select
                      required
                      value={dealId}
                      onChange={(e) => setDealId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    >
                      <option value="">Selecciona un municipi...</option>
                      {activeDeals.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.municipi?.nom || `Deal #${d.id}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Descripció de l'acció */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Descripció</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Presentació demo de Mirador"
                    value={contingut}
                    onChange={(e) => setContingut(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>

                {/* Grid Tipus + Checklist */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tipus</label>
                    <select
                      value={tipus}
                      onChange={(e) => setTipus(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    >
                      <option value="seguiment">Seguiment</option>
                      <option value="demo">Demo</option>
                      <option value="reunio">Reunió</option>
                      <option value="renovacio">Renovació</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end pb-1.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={esTasca}
                        onChange={(e) => setEsTasca(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">És Tasca (Checklist)</span>
                    </label>
                  </div>
                </div>

                {/* Grid Inici + Fi */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Data Inici</label>
                    <input
                      required
                      type="datetime-local"
                      value={dataInici}
                      onChange={(e) => setDataInici(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Data Fi</label>
                    <input
                      required
                      type="datetime-local"
                      value={dataFi}
                      onChange={(e) => setDataFi(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    />
                  </div>
                </div>

                {/* Estat completat (només en edició) */}
                {selectedEvent && (
                  <div className="py-2 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Estat de finalització:</span>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={completat}
                        onChange={(e) => setCompletat(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        Completat <Check size={14} className={completat ? "text-emerald-500" : "text-slate-400"} />
                      </span>
                    </label>
                  </div>
                )}

                {/* Accions / Botons */}
                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-900">
                  {selectedEvent && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 border border-red-200 hover:bg-red-50 text-red-500 dark:border-red-950/30 dark:hover:bg-red-900/10 rounded-xl transition-colors flex items-center justify-center"
                      title="Eliminar esdeveniment"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Cancel·lar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (selectedEvent ? 'Guardar' : 'Crear')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPanel;

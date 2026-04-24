import React, { useState } from 'react';
import { useDeal } from '../context/DealContext';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Calendar, 
  User, 
  Clock,
  PlusCircle,
  Loader2
} from 'lucide-react';

const UnifiedTimeline: React.FC = () => {
  const { deal, mutate } = useDeal();
  const [showEventForm, setShowEventForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newEvent, setNewEvent] = useState({
    tipus: 'reunio',
    contingut: '',
    data: '',
    data_fi: ''
  });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleSaveEvent = async () => {
    if (!newEvent.contingut.trim() || !newEvent.data || !deal) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/interaccions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          tipus: newEvent.tipus,
          contingut: newEvent.contingut,
          data: new Date(newEvent.data).toISOString(),
          data_fi: newEvent.data_fi ? new Date(newEvent.data_fi).toISOString() : null,
          autor: 'Usuari'
        })
      });

      if (response.ok) {
        setShowEventForm(false);
        setNewEvent({ tipus: 'reunio', contingut: '', data: '', data_fi: '' });
        mutate();
      }
    } catch (error) {
      console.error("Error guardant l'esdeveniment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!deal?.interaccions || deal.interaccions.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        <p className="text-slate-500">No hi ha interaccions registrades.</p>
      </div>
    );
  }

  // Ordenar cronològicament (més recent primer)
  const sortedInteraccions = [...deal.interaccions].sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  const getIcon = (tipus: string) => {
    switch (tipus) {
      case 'email_in':
      case 'email_out': return <Mail size={16} className="text-blue-500" />;
      case 'trucada': return <Phone size={16} className="text-indigo-500" />;
      case 'reunio': return <Calendar size={16} className="text-emerald-500" />;
      default: return <MessageSquare size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Add Form Toggle */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => setShowEventForm(!showEventForm)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
        >
          <PlusCircle size={16} />
          {showEventForm ? 'Cancel·lar' : 'Programar Esdeveniment'}
        </button>
      </div>

      {showEventForm && (
        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-xl shadow-sm mb-6 animate-in slide-in-from-top-2">
          <h4 className="font-bold text-indigo-900 dark:text-indigo-400 mb-4 flex items-center gap-2">
            <Calendar size={16} /> Nou Esdeveniment al Calendari
          </h4>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Tipus d'Esdeveniment</label>
                <select 
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white"
                  value={newEvent.tipus}
                  onChange={(e) => setNewEvent({...newEvent, tipus: e.target.value})}
                >
                  <option value="reunio">Reunió</option>
                  <option value="trucada">Trucada</option>
                  <option value="visita">Visita Comercial</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Assumpte / Detalls</label>
                <input 
                  type="text" 
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white"
                  placeholder="Ex: Presentació Projecte"
                  value={newEvent.contingut}
                  onChange={(e) => setNewEvent({...newEvent, contingut: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Data d'inici</label>
                <input 
                  type="datetime-local" 
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white"
                  value={newEvent.data}
                  onChange={(e) => setNewEvent({...newEvent, data: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Data final (Opcional)</label>
                <input 
                  type="datetime-local" 
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white"
                  value={newEvent.data_fi}
                  onChange={(e) => setNewEvent({...newEvent, data_fi: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSaveEvent}
                disabled={isSaving || !newEvent.contingut.trim() || !newEvent.data}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                Programar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">

      {sortedInteraccions.map((item) => (
        <div key={item.id} className="relative pl-10 group">
          {/* Dot i Icona */}
          <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center z-10 group-hover:border-indigo-500 transition-colors">
            {getIcon(item.tipus)}
          </div>

          {/* Card d'interacció */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {item.tipus.replace('_', ' ')}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <User size={12} />
                  <span>{item.autor || 'Sistema'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock size={12} />
                <span>{new Date(item.data).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {item.contingut}
            </div>

            {item.data_fi && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-900 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 italic">
                <Calendar size={12} />
                <span>Finalització programada: {new Date(item.data_fi).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

export default UnifiedTimeline;

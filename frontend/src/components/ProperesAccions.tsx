import React, { useState } from 'react';
import { useDeal } from '../context/DealContext';
import { Circle, Calendar, Phone, Mail, Presentation, Plus, Loader2 } from 'lucide-react';

const ProperesAccions: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [isAdding, setIsAdding] = useState(false);
  const [loadingType, setLoadingType] = useState<string | null>(null);

  if (!deal?.accions) return null;

  // Filtrem per tipus accionables i no completats
  const tipusAccions = ["calendar", "trucada", "demo", "reunio", "tasca_programada"];
  const pendents = deal.accions.filter(i => tipusAccions.includes(i.tipus) && !i.is_completed);

  const toggleStatus = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE}/accions/${id}/completar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) await refreshDeal();
    } catch (error) {
      console.error("Error al completar l'acció:", error);
    }
  };

  const handleQuickAdd = async (tipus: string) => {
    if (!deal) return;
    setLoadingType(tipus);
    
    // Data per defecte: demà a les 10:00
    const dema = new Date();
    dema.setDate(dema.getDate() + 1);
    dema.setHours(10, 0, 0, 0);

    const payload = {
      tipus,
      contingut: `Nova ${tipus} programada`,
      data_programada: dema.toISOString(),
      metadata_json: { origen: 'quick_creator' }
    };

    try {
      const response = await fetch(`${API_BASE}/deals/${deal.id}/accions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        await refreshDeal();
        setIsAdding(false);
      }
    } catch (error) {
      console.error("Error creant acció ràpida:", error);
    } finally {
      setLoadingType(null);
    }
  };

  const getIcon = (tipus: string) => {
    switch (tipus) {
      case 'trucada': return <Phone size={14} />;
      case 'email': return <Mail size={14} />;
      case 'demo': return <Presentation size={14} />;
      case 'reunio': return <Calendar size={14} />;
      default: return <Calendar size={14} />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30 flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Calendar size={14} />
          Properes Accions (Checklist)
        </h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-colors text-amber-700 dark:text-amber-400"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Llista de pendents */}
        {pendents.length === 0 && !isAdding ? (
          <p className="text-[10px] text-slate-400 italic text-center py-2">No hi ha accions pendents.</p>
        ) : (
          <div className="space-y-4">
            {pendents.map(task => (
              <div key={task.id} className="flex items-start gap-3 group">
                <button 
                  onClick={() => toggleStatus(task.id)}
                  className="mt-0.5 text-slate-300 hover:text-indigo-600 transition-colors"
                  title="Marcar com a fet"
                >
                  <Circle size={20} />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {task.contingut}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-black tracking-tighter">
                      {getIcon(task.tipus)}
                      {new Date(task.data).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 rounded text-[8px] font-bold uppercase text-slate-400">
                      {task.tipus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Creador Ràpid */}
        {isAdding && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-900 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest text-center">Programar Nova:</p>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => handleQuickAdd('trucada')}
                disabled={loadingType !== null}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group"
              >
                {loadingType === 'trucada' ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <Phone size={16} className="text-slate-400 group-hover:text-indigo-600" />}
                <span className="text-[8px] font-black uppercase text-slate-500">Trucada</span>
              </button>
              <button 
                onClick={() => handleQuickAdd('reunio')}
                disabled={loadingType !== null}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group"
              >
                {loadingType === 'reunio' ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <Calendar size={16} className="text-slate-400 group-hover:text-indigo-600" />}
                <span className="text-[8px] font-black uppercase text-slate-500">Reunió</span>
              </button>
              <button 
                onClick={() => handleQuickAdd('demo')}
                disabled={loadingType !== null}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group"
              >
                {loadingType === 'demo' ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <Presentation size={16} className="text-slate-400 group-hover:text-indigo-600" />}
                <span className="text-[8px] font-black uppercase text-slate-500">Demo</span>
              </button>
            </div>
            <button 
              onClick={() => setIsAdding(false)}
              className="w-full mt-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel·lar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProperesAccions;

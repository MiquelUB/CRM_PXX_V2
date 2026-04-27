import React from 'react';
import { useDeal } from '../context/DealContext';
import { Circle, Calendar, Phone, Mail, Presentation } from 'lucide-react';

const ProperesAccions: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  if (!deal?.interaccions) return null;

  // Filtrem per calendari i no completat
  const pendents = deal.interaccions.filter(i => i.tipus === 'calendar' && !i.is_completed);

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/interaccions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !currentStatus })
      });
      
      if (response.ok) {
        await refreshDeal();
      }
    } catch (error) {
      console.error("Error al canviar l'estat de la tasca:", error);
    }
  };

  const getIcon = (contingut: string) => {
    const text = contingut.toLowerCase();
    if (text.includes('trucada') || text.includes('trucar')) return <Phone size={14} />;
    if (text.includes('email') || text.includes('correu')) return <Mail size={14} />;
    if (text.includes('demo') || text.includes('presentació')) return <Presentation size={14} />;
    return <Calendar size={14} />;
  };

  if (pendents.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30">
        <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Calendar size={14} />
          Properes Accions (Checklist)
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {pendents.map(task => (
          <div key={task.id} className="flex items-start gap-3 group">
            <button 
              onClick={() => toggleStatus(task.id, task.is_completed)}
              className="mt-0.5 text-slate-300 hover:text-indigo-600 transition-colors"
              title="Marcar com a completat"
            >
              <Circle size={20} />
            </button>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {task.contingut}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-black tracking-tighter">
                  {getIcon(task.contingut)}
                  {task.metadata_json?.data_hora ? new Date(task.metadata_json.data_hora).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' }) : 'Sense data'}
                </span>
                {task.metadata_json?.tipus_acccio && (
                   <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 rounded text-[8px] font-bold uppercase text-slate-400">
                     {task.metadata_json.tipus_acccio}
                   </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProperesAccions;

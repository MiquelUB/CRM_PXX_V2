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
  Loader2,
  FileText,
  Activity
} from 'lucide-react';

const UnifiedTimeline: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const [showEventForm, setShowEventForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newEvent, setNewEvent] = useState({
    tipus: 'NOTA_MANUAL',
    contingut: '',
  });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleSaveEvent = async () => {
    if (!newEvent.contingut.trim() || !deal) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/interaccions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          tipus: newEvent.tipus,
          contingut: newEvent.contingut,
          autor: 'Usuari'
        })
      });

      if (response.ok) {
        setShowEventForm(false);
        setNewEvent({ tipus: 'NOTA_MANUAL', contingut: '' });
        await refreshDeal();
      }
    } catch (error) {
      console.error("Error guardant la interacció:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!deal?.interaccions || deal.interaccions.length === 0) {
    return (
      <div className="space-y-4">
        <AddInteractionForm 
          show={showEventForm} 
          setShow={setShowEventForm} 
          isSaving={isSaving} 
          newEvent={newEvent} 
          setNewEvent={setNewEvent} 
          handleSave={handleSaveEvent} 
        />
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-slate-500">No hi ha interaccions registrades en la Bitàcola.</p>
        </div>
      </div>
    );
  }

  // Ordenar per data_creacio (més recent primer)
  const sortedInteraccions = [...deal.interaccions].sort((a, b) => 
    new Date(b.data_creacio).getTime() - new Date(a.data_creacio).getTime()
  );

  const getIcon = (tipus: string) => {
    switch (tipus) {
      case 'EMAIL': return <Mail size={16} className="text-blue-500" />;
      case 'NOTA_MANUAL': return <FileText size={16} className="text-amber-500" />;
      case 'SISTEMA': return <Activity size={16} className="text-slate-500" />;
      default: return <MessageSquare size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <AddInteractionForm 
        show={showEventForm} 
        setShow={setShowEventForm} 
        isSaving={isSaving} 
        newEvent={newEvent} 
        setNewEvent={setNewEvent} 
        handleSave={handleSaveEvent} 
      />

      <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {sortedInteraccions.map((item) => (
          <div key={item.id} className="relative pl-10 group">
            <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center z-10 group-hover:border-indigo-500 transition-colors shadow-sm">
              {getIcon(item.tipus)}
            </div>

            <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {item.tipus}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <User size={12} />
                    <span>{item.autor || 'Sistema'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                  <Clock size={12} />
                  <span>{new Date(item.data_creacio).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {item.contingut}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface FormProps {
  show: boolean;
  setShow: (v: boolean) => void;
  isSaving: boolean;
  newEvent: any;
  setNewEvent: (v: any) => void;
  handleSave: () => void;
}

const AddInteractionForm: React.FC<FormProps> = ({ show, setShow, isSaving, newEvent, setNewEvent, handleSave }) => (
  <div className="space-y-4">
    <div className="flex justify-end">
      <button 
        onClick={() => setShow(!show)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95"
      >
        <PlusCircle size={16} />
        {show ? 'Cancel·lar' : 'Nova Entrada Bitàcola'}
      </button>
    </div>

    {show && (
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-inner animate-in slide-in-from-top-2">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-1">Tipus de Registre</label>
            <select 
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              value={newEvent.tipus}
              onChange={(e) => setNewEvent({...newEvent, tipus: e.target.value})}
            >
              <option value="NOTA_MANUAL">Nota Manual</option>
              <option value="EMAIL">Registre de Correu</option>
              <option value="SISTEMA">Alerta de Sistema</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-1">Contingut de la interacció</label>
            <textarea 
              rows={3}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Escriu què ha passat..."
              value={newEvent.contingut}
              onChange={(e) => setNewEvent({...newEvent, contingut: e.target.value})}
            />
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving || !newEvent.contingut.trim()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-black hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
              Registrar
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default UnifiedTimeline;

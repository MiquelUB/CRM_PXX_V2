import React, { useState } from 'react';
import { useDeal } from '../context/DealContext';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

const NotesBox: React.FC = () => {
  const { deal, mutate } = useDeal();
  const [nota, setNota] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleSave = async () => {
    if (!nota.trim() || !deal) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/interaccions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          tipus: 'nota',
          contingut: nota,
          autor: 'Usuari' // En el futur pot venir d'un AuthContext
        })
      });

      if (response.ok) {
        setNota('');
        // SWR Mutation: Refresca el timeline instantàniament
        mutate();
      }
    } catch (error) {
      console.error("Error guardant la nota:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <MessageSquare size={14} className="text-indigo-600" />
          Notes d'Activitat
        </div>
      </div>
      <div className="p-4">
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Escriu una nota sobre l'estat actual del projecte. Aquesta informació alimentarà la memòria de l'agent IA..."
          className="w-full min-h-[120px] bg-transparent text-slate-900 dark:text-white outline-none resize-none text-sm placeholder:text-slate-400"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !nota.trim()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-400 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Guardar Nota
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesBox;

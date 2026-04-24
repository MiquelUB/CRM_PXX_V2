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
  Activity,
  Send,
  AlertCircle
} from 'lucide-react';

const UnifiedTimeline: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleAddNote = async (text: string) => {
    if (!text.trim() || isSubmitting || !deal) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/interaccions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          tipus: 'NOTA_MANUAL', // Hardcodejat per seguretat com s'ha demanat
          contingut: text,
          autor: 'Usuari'
        })
      });
      
      if (!response.ok) throw new Error("Error en l'enviament");
      
      await refreshDeal();
      setContent(''); // Netejar el camp de text només si hi ha èxit
    } catch (err) {
      console.error("Fallada al desar la nota:", err);
      setError("No s'ha pogut desar la nota. Torna-ho a intentar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ordenar per data_creacio (més recent primer)
  const sortedInteraccions = deal?.interaccions 
    ? [...deal.interaccions].sort((a, b) => new Date(b.data_creacio).getTime() - new Date(a.data_creacio).getTime())
    : [];

  const getIcon = (tipus: string) => {
    switch (tipus) {
      case 'EMAIL': return <Mail size={16} className="text-blue-500" />;
      case 'NOTA_MANUAL': return <FileText size={16} className="text-amber-500" />;
      case 'SISTEMA': return <Activity size={16} className="text-slate-500" />;
      default: return <MessageSquare size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Capsa de Vitàcola (Substitueix el NotesBox) */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="p-4 border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
            <MessageSquare size={14} className="text-indigo-600" />
            Nova Entrada a la Bitàcola (Nota Manual)
          </div>
        </div>
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            placeholder="Escriu una nota sobre l'estat actual del projecte..."
            className="w-full min-h-[120px] bg-transparent text-slate-900 dark:text-white outline-none resize-none text-sm placeholder:text-slate-400 leading-relaxed"
          />
          
          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-xs font-bold mb-3 animate-pulse">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="flex justify-end mt-2">
            <button
              onClick={() => handleAddNote(content)}
              disabled={isSubmitting || !content.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-400 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Registrar Nota
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">Historial d'activitat</h3>
        
        {sortedInteraccions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm italic">No hi ha registres en la bitàcola encara.</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default UnifiedTimeline;

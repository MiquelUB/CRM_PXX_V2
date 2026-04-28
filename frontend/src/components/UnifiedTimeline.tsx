import React, { useState } from 'react';
import { useDeal } from '../context/DealContext';
import { 
  Mail, 
  MessageSquare, 
  Loader2,
  FileText,
  Activity,
  Send,
  Bot
} from 'lucide-react';

const UnifiedTimeline: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleAddNote = async (text: string) => {
    if (!text.trim() || isSubmitting || !deal) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE}/interaccions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          tipus: 'NOTA_MANUAL',
          contingut: text,
          metadata_json: { 
            autor: 'Usuari Humà', // Traçabilitat injectada al JSON
            origen: 'web_frontend' 
          }
        })
      });
      
      if (!response.ok) throw new Error("Error en l'enviament");
      
      await refreshDeal();
      setContent('');
    } catch (err) {
      console.error("Fallada al desar la nota:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedInteraccions = deal?.accions 
    ? [...deal.accions].sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
    : [];

  const getIcon = (tipus: string) => {
    switch (tipus) {
      case 'EMAIL': return <Mail size={16} className="text-indigo-500" />;
      case 'NOTA_MANUAL': return <FileText size={16} className="text-amber-500" />;
      case 'SYSTEM_LOG': return <Activity size={16} className="text-slate-400" />;
      case 'kimi_chat': return <Bot size={16} className="text-emerald-500" />;
      default: return <MessageSquare size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Capsa de Vitàcola (Textarea de Nova Nota) */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Nova Nota Manual
          </div>
        </div>
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            placeholder="Anotació ràpida sobre el deal..."
            className="w-full min-h-[80px] bg-transparent text-slate-900 dark:text-white outline-none resize-none text-sm placeholder:text-slate-400 leading-relaxed"
          />
          
          <div className="flex justify-end mt-2">
            <button
              onClick={() => handleAddNote(content)}
              disabled={isSubmitting || !content.trim()}
              className="flex items-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-950 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all hover:opacity-90 disabled:opacity-30"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Registrar a la Bitàcola
            </button>
          </div>
        </div>
      </div>

      {/* Llistat Cronològic */}
      <div className="space-y-4">
        {sortedInteraccions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-slate-500 text-xs italic">La bitàcola està buida.</p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-900">
            {sortedInteraccions.map((item: any) => {
              const metadata = item.metadata_json || {};
              const autor = metadata.autor || (item.tipus === 'kimi_chat' ? 'Kimi' : 'Sistema');

              return (
                <div key={item.id} className="relative pl-10">
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center z-10 shadow-sm">
                    {getIcon(item.tipus)}
                  </div>

                  <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                          {autor}
                        </span>
                        <span className="text-slate-300 dark:text-slate-800 text-[10px]">/</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {item.tipus}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(item.data).toLocaleDateString()} {new Date(item.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {item.contingut}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default UnifiedTimeline;

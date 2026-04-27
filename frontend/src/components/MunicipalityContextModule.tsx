import React, { useState } from 'react';
import { useDeal } from '../context/DealContext';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const MunicipalityContextModule: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validació d'extensió (.md)
    if (!file.name.endsWith('.md')) {
      setFeedback({ type: 'error', msg: 'Només s\'admeten fitxers .md' });
      return;
    }

    // Validació de pes (< 50KB)
    if (file.size > 50 * 1024) {
      setFeedback({ type: 'error', msg: 'El fitxer ha de pesar menys de 50KB' });
      return;
    }

    setFeedback(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        const response = await fetch(`${API_BASE}/deals/${deal?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ municipality_context: content })
        });

        if (response.ok) {
          setFeedback({ type: 'success', msg: 'Context actualitzat correctament' });
          await refreshDeal();
        } else {
          const errData = await response.json();
          setFeedback({ type: 'error', msg: `Error: ${errData.detail || 'No s\'ha pogut pujar'}` });
        }
      } catch (err) {
        setFeedback({ type: 'error', msg: 'Error de connexió amb el servidor' });
      } finally {
        setIsUploading(false);
        // Netejar l'input
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      setFeedback({ type: 'error', msg: 'Error llegint el fitxer' });
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  if (!deal) return null;

  return (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center gap-3 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="font-bold">Context Local de l'IA</h3>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Puja un fitxer <span className="font-mono font-bold">.md</span> amb dades específiques del municipi per millorar les respostes de l'agent Kimi (màx. 50KB).
        </p>

        <div className="relative">
          <label 
            className={`
              flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer
              transition-all duration-200
              ${isUploading ? 'bg-slate-50 border-slate-200 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30'}
            `}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <Loader2 className="w-8 h-8 mb-3 animate-spin text-indigo-600" />
              ) : (
                <Upload className="w-8 h-8 mb-3 text-slate-400" />
              )}
              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="font-bold">Clica per pujar</span> o arrossega
              </p>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-tighter">Markdown (.md)</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".md" 
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>

        {feedback && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-1 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {feedback.msg}
          </div>
        )}

        {deal.municipality_context && !feedback && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle size={14} />
            Context actualitzat i actiu a la memòria de l'agent.
          </div>
        )}
      </div>
    </div>
  );
};

export default MunicipalityContextModule;

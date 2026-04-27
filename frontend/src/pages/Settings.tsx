import React, { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle, AlertCircle, BookOpen, Settings as SettingsIcon } from 'lucide-react';

const Settings: React.FC = () => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/knowledge/pxx_general`);
        if (response.ok) {
          const data = await response.json();
          setContent(data.content);
        } else if (response.status === 404) {
          // Si no existeix, el deixem buit
          setContent('');
        }
      } catch (err) {
        console.error('Error fetching knowledge:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKnowledge();
  }, [API_BASE]);

  const handleSave = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/pxx_general`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        setFeedback({ type: 'success', msg: 'Argumentari global desat correctament' });
      } else {
        const errData = await response.json();
        setFeedback({ type: 'error', msg: `Error: ${errData.detail || 'No s\'ha pogut desar'}` });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Error de connexió amb el servidor' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="font-medium">Carregant configuració...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
            <SettingsIcon className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Configuració</h1>
            <p className="text-slate-500 font-medium">Gestiona el coneixement global de l'IA</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all duration-200
            ${isSubmitting 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-100 dark:shadow-none'}
          `}
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {isSubmitting ? 'Desant...' : 'Desar Canvis'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">Argumentari de Vendes Global (pxx_general)</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">
                Markdown suportat
              </span>
            </div>
            
            <div className="p-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Argumentari PXX V2\nEscriu aquí les instruccions globals per a l'IA..."
                className="w-full h-[60vh] p-6 text-slate-700 dark:text-slate-300 bg-transparent resize-none focus:outline-none font-mono text-sm leading-relaxed"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
            <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              Instruccions d'ús
            </h4>
            <ul className="text-xs text-amber-700 dark:text-amber-500/80 space-y-3 leading-relaxed">
              <li>• Aquest text s'injecta a <strong>totes</strong> les interaccions amb l'IA Kimi.</li>
              <li>• Utilitza-ho per definir el to, la personalitat i les regles de negoci generals.</li>
              <li>• Pots fer servir <strong>Markdown</strong> per estructurar la informació.</li>
              <li>• Evita dades específiques de municipis aquí; per això hi ha el context local a cada Deal.</li>
              <li>• Límit de seguretat: 50.000 caràcters.</li>
            </ul>
          </div>

          {feedback && (
            <div className={`p-6 rounded-3xl border animate-in fade-in slide-in-from-right-4 duration-300 ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-400' 
                : 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-400'
            }`}>
              <div className="flex items-start gap-3">
                {feedback.type === 'success' ? <CheckCircle className="mt-0.5" size={18} /> : <AlertCircle className="mt-0.5" size={18} />}
                <div>
                  <p className="font-bold text-sm">{feedback.type === 'success' ? 'Èxit' : 'Error'}</p>
                  <p className="text-xs mt-1 opacity-90">{feedback.msg}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

import React, { useState, useEffect, useRef } from 'react';
import { useDeal } from '../context/DealContext';
import { Bot, Send, Loader2, User, Sparkles, Copy, Save, Check } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const KimiChatIntegrated: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copyingIdx, setCopyingIdx] = useState<number | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchHistory = async () => {
      if (!deal) return;
      try {
        const response = await fetch(`${API_BASE}/agent/deals/${deal.id}/history`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.history || []);
        }
      } catch (error) {
        console.error("Error carregant historial de Kimi:", error);
      }
    };
    fetchHistory();
  }, [deal?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopyingIdx(idx);
    setTimeout(() => setCopyingIdx(null), 2000);
  };

  const handleSaveToDiary = async (text: string, idx: number) => {
    if (!deal) return;
    setSavingIdx(idx);
    try {
      const response = await fetch(`${API_BASE}/interaccions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          tipus: 'nota',
          contingut: text
        })
      });
      if (response.ok) {
        await refreshDeal();
        setTimeout(() => setSavingIdx(null), 2000);
      }
    } catch (error) {
      console.error("Error al guardar al diari:", error);
      setSavingIdx(null);
    }
  };

  const handleAskKimi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !deal) return;

    const userQuery = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);

    try {
      const response = await fetch(`${API_BASE}/agent/deals/${deal.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      });

      if (!response.ok) throw new Error("Error agent");

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

      // Si l'agent ha executat una acció d'agenda → revalidar tota la UI del Deal
      if (data.tool_action === 'agenda_created') {
        await refreshDeal();
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "M'he quedat sense connexió. Torna-ho a provar." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 dark:border-slate-900 bg-slate-900 text-white flex items-center gap-3">
        <Bot size={18} className="text-indigo-400" />
        <span className="text-xs font-black uppercase tracking-[0.2em]">Estratègia Kimi k2.5</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
            <Sparkles size={32} className="mb-2 text-indigo-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              Hola. Sóc Kimi.<br/>Analitzem aquest deal?
            </p>
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${m.role === 'user' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-indigo-600 text-white'}`}>
                  {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                </div>
                <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 text-slate-700 dark:text-slate-300 rounded-tl-none shadow-sm'
                }`}>
                  {m.content}
                </div>
              </div>
              
              {m.role === 'assistant' && (
                <div className="flex gap-2 mt-1 ml-8">
                  <button 
                    onClick={() => handleCopy(m.content, idx)}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {copyingIdx === idx ? <Check size={10} /> : <Copy size={10} />}
                    {copyingIdx === idx ? 'Copiat' : 'Copiar'}
                  </button>
                  <button 
                    onClick={() => handleSaveToDiary(m.content, idx)}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {savingIdx === idx ? <Check size={10} /> : <Save size={10} />}
                    {savingIdx === idx ? 'Guardat' : 'Guardar al Diari'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <Bot size={12} />
              </div>
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl rounded-tl-none shadow-sm">
                <Loader2 size={12} className="animate-spin text-indigo-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/20">
        <form onSubmit={handleAskKimi} className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ordre estratègica..."
            className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-slate-900 dark:bg-white dark:text-slate-950 text-white p-2 rounded-xl disabled:opacity-30 transition-all"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default KimiChatIntegrated;

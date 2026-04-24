import React, { useState, useEffect, useRef } from 'react';
import { useDeal } from '../context/DealContext';
import { Bot, Send, X, Loader2, Sparkles, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface KimiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const KimiChatDrawer: React.FC<KimiChatDrawerProps> = ({ isOpen, onClose }) => {
  const { deal, refreshDeal } = useDeal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    return () => {
      // Cancela la crida a xarxa si l'usuari tanca el calaix o el component es desmunta
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAgentTyping]);

  const handleAskKimi = async (query: string) => {
    if (!query.trim() || isAgentTyping || !deal) return;
    
    abortControllerRef.current = new AbortController();
    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsAgentTyping(true);
    
    try {
      const response = await fetch(`${API_BASE}/agent/deals/${deal.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: abortControllerRef.current.signal // Evita el leak si es tanca el component
      });
      
      if (!response.ok) throw new Error("Error de l'Agent");
      
      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Si la IA ha inserit cites o notes per darrere, cal forçar el refresc del context
      await refreshDeal(); 
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn("Petició LLM cancel·lada per tancament de UI.");
      } else {
        console.error("Error al xat amb Kimi:", error);
        setMessages(prev => [...prev, { role: 'assistant', content: "Ho sento, s'ha produït un error al connectar amb el meu cervell central." }]);
      }
    } finally {
      setIsAgentTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Drawer Content */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="font-black text-lg leading-none">Kimi k2.5</h2>
              <p className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">Agent IA Autònom</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Chat Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 px-12">
              <Sparkles size={48} className="text-indigo-500" />
              <p className="text-sm font-medium text-slate-500">
                Hola! Sóc Kimi. Puc ajudar-te a analitzar l'historial del projecte o programar cites al calendari directament.
              </p>
            </div>
          )}
          
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-200 dark:bg-slate-800' : 'bg-indigo-600 text-white'}`}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none shadow-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            </div>
          ))}

          {isAgentTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none shadow-sm">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/20">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAskKimi(input);
            }}
            className="flex gap-3"
          >
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isAgentTyping}
              placeholder="Pregunta qualsevol cosa sobre el projecte..."
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={isAgentTyping || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:bg-slate-400 transition-all active:scale-95"
            >
              <Send size={20} />
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">
            Kimi k2.5 pot cometre errors. Revisa la informació important.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KimiChatDrawer;

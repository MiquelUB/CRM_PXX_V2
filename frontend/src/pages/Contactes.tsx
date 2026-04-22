import React from 'react';
import useSWR from 'swr';
import { User, Mail, Phone, MapPin, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => res.json());

const Contactes: React.FC = () => {
  const { data: contactes } = useSWR(`${API_BASE}/contactes`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Agenda de Metadades</h1>
          <p className="text-slate-500 text-sm">Informació de referència vinculada obligatòriament a un Municipi.</p>
        </div>
      </div>

      {/* Barra de cerca simple */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Cercar contactes..." 
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {contactes?.map((c: any) => (
          <div key={c.id} className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <User size={24} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-500 uppercase tracking-tighter">
                <MapPin size={10} />
                {c.deal?.municipi?.nom || 'N/A'}
              </div>
            </div>
            
            <div className="space-y-1 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{c.nom}</h3>
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{c.carrec || 'Sense càrrec'}</p>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-50 dark:border-slate-900 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Mail size={14} className="text-slate-400" />
                <span className="truncate">{c.email}</span>
              </div>
              {c.telefon && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone size={14} className="text-slate-400" />
                  <span>{c.telefon}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Contactes;

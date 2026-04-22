import React from 'react';
import useSWR from 'swr';
import { MapPin, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => res.json());

const Municipis: React.FC = () => {
  const { data: municipis, mutate } = useSWR(`${API_BASE}/municipis`, fetcher);

  const handleDelete = async (id: string) => {
    if (confirm("🚨 ATENCIÓ CRÍTICA: Aquesta acció eliminarà el Deal i els Contactes associats a aquest municipi. Estàs segur?")) {
      await fetch(`${API_BASE}/municipis/${id}`, { method: 'DELETE' });
      mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Directori de Municipis</h1>
          <p className="text-slate-500 text-sm">Nivell 0: Jerarquia Arrel del Sistema.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
          <Plus size={20} />
          Nou Municipi
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Municipi</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Província</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Habitants</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Accions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {municipis?.map((m: any) => (
              <tr key={m.codi_ine} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <MapPin size={18} />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{m.nom}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{m.provincia}</td>
                <td className="px-6 py-4 text-sm font-medium text-right text-slate-700 dark:text-slate-300">
                  {m.poblacio?.toLocaleString() || 'N/A'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    {/* Enllaç al Deal (Suposem que m.deals[0] existeix segons la lògica de 1 municipi = 1 deal) */}
                    <Link 
                      to={`/deals/${m.deals?.[0]?.id}`}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="Veure Deal"
                    >
                      <ExternalLink size={18} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(m.codi_ine)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                      title="Eliminar Municipi"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Municipis;

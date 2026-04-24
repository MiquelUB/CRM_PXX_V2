import React from 'react';
import useSWR from 'swr';
import { MapPin, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

const Municipis: React.FC = () => {
  const { data: municipis, mutate } = useSWR(`${API_BASE}/municipis`, fetcher);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({ nom: '', provincia: '', codi_ine: '', poblacio: 0 });

  const handleDelete = async (id: string) => {
    if (confirm("🚨 ATENCIÓ CRÍTICA: Aquesta acció eliminarà el Deal i els Contactes associats a aquest municipi. Estàs segur?")) {
      await fetch(`${API_BASE}/municipis/${id}`, { method: 'DELETE' });
      mutate();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API_BASE}/municipis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    setIsModalOpen(false);
    setFormData({ nom: '', provincia: '', codi_ine: '', poblacio: 0 });
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Directori de Municipis</h1>
          <p className="text-slate-500 text-sm">Nivell 0: Jerarquia Arrel del Sistema.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nou Municipi
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4">Afegir Nou Municipi</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Nom</label>
                <input 
                  required
                  type="text" 
                  value={formData.nom}
                  onChange={e => setFormData({...formData, nom: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Codi INE</label>
                  <input 
                    required
                    type="text" 
                    value={formData.codi_ine}
                    onChange={e => setFormData({...formData, codi_ine: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Població</label>
                  <input 
                    type="number" 
                    value={formData.poblacio}
                    onChange={e => setFormData({...formData, poblacio: parseInt(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Província</label>
                <input 
                  required
                  type="text" 
                  value={formData.provincia}
                  onChange={e => setFormData({...formData, provincia: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    {m.deals?.[0]?.id ? (
                      <Link 
                        to={`/deals/${m.deals[0].id}`}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title="Veure Deal"
                      >
                        <ExternalLink size={18} />
                      </Link>
                    ) : (
                      <div className="p-2 text-slate-300 cursor-not-allowed" title="Sense projecte actiu">
                        <ExternalLink size={18} />
                      </div>
                    )}
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

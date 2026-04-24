import React from 'react';
import useSWR from 'swr';
import { Briefcase, Building, Calendar, ArrowRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error HTTP: ${res.status}`);
  }
  return res.json();
};

const Deals: React.FC = () => {
  const { data: deals, error, isLoading, mutate } = useSWR(`${API_BASE}/deals`, fetcher);
  const { data: municipis } = useSWR(`${API_BASE}/municipis`, fetcher);
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    titol: '',
    municipi_id: ''
  });

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titol: formData.titol,
          municipi_id: formData.municipi_id,
          estat: 'prospecte'
        })
      });
      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ titol: '', municipi_id: '' });
        mutate();
      }
    } catch (error) {
      console.error("Error creating deal", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-slate-500 font-medium animate-pulse">Carregant deals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex flex-col items-center justify-center h-64 text-center">
        <span className="text-4xl mb-4">🚨</span>
        <h3 className="text-lg font-bold mb-2">Error de Connexió</h3>
        <p className="text-sm opacity-80 max-w-md">{error.message}</p>
      </div>
    );
  }

  const getEstatStyle = (estat: string) => {
    switch (estat) {
      case 'prospecte': return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
      case 'contactat': return 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800';
      case 'reunio': return 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800';
      case 'tancat': return 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Deals (Projectes)
          </h1>
          <p className="text-slate-500 mt-2">
            Gestió completa de tots els projectes vinculats a municipis.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <span className="text-xl leading-none mb-0.5">+</span>
          Nou Projecte
        </button>
      </header>

      {/* Modal Nou Deal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4">Nou Projecte (Deal)</h2>
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Títol del Projecte</label>
                <input 
                  required
                  type="text" 
                  value={formData.titol}
                  onChange={e => setFormData({...formData, titol: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Auditori Municipal"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Municipi</label>
                <select 
                  required
                  value={formData.municipi_id}
                  onChange={e => setFormData({...formData, municipi_id: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecciona un municipi...</option>
                  {municipis?.map((m: any) => (
                    <option key={m.codi_ine} value={m.codi_ine}>{m.nom}</option>
                  ))}
                </select>
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
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Creant...' : 'Crear Projecte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Llistat de Deals */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4 font-bold">Deal / Títol</th>
                <th className="px-6 py-4 font-bold">Municipi</th>
                <th className="px-6 py-4 font-bold">Estat</th>
                <th className="px-6 py-4 font-bold">Data Creació</th>
                <th className="px-6 py-4 font-bold text-right">Accions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {deals && deals.length > 0 ? (
                deals.map((deal: any) => (
                  <tr 
                    key={deal.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{deal.titol}</p>
                          <p className="text-xs text-slate-500 font-mono">ID #{deal.id}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Building size={14} className="text-slate-400" />
                          {deal.municipi?.nom || 'Desconegut'}
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5 ml-5">
                          {deal.municipi?.provincia || '-'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-md border ${getEstatStyle(deal.estat)}`}>
                        {deal.estat}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Calendar size={14} />
                        {new Date(deal.data_creacio).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/deals/${deal.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Veure Detall <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No hi ha deals registrats a la base de dades.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Deals;

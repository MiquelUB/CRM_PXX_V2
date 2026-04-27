import React from 'react';
import useSWR from 'swr';
import { MapPin, Plus, ExternalLink, Trash2, ShieldCheck, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

const Municipis: React.FC = () => {
  const navigate = useNavigate();
  const { data: municipis, mutate } = useSWR(`${API_BASE}/municipis`, fetcher);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({ 
    nom: '', 
    codi_ine: '', 
    provincia: '',
    poblacio: '',
    adreca_fisica: '',
    pla_saas: 'Pla de Venda' 
  });

  const handleDelete = async (id: string) => {
    if (confirm("🚨 ATENCIÓ CRÍTICA: Aquesta acció eliminarà el Deal i els Contactes associats a aquest municipi. Estàs segur?")) {
      await fetch(`${API_BASE}/municipis/${id}`, { method: 'DELETE' });
      mutate();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        municipi: {
          nom: formData.nom,
          codi_ine: formData.codi_ine,
          provincia: formData.provincia,
          poblacio: formData.poblacio ? parseInt(formData.poblacio) : null,
          adreca_fisica: formData.adreca_fisica
        },
        pla_assignat: formData.pla_saas, // Mantenim pla_assignat pel backend onboarding
        contactes: [] 
      };

      const response = await fetch(`${API_BASE}/deals/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setIsModalOpen(false);
        setFormData({ nom: '', codi_ine: '', provincia: '', poblacio: '', adreca_fisica: '', pla_saas: 'Pla de Venda' });
        mutate();
        navigate(`/deals/${result.deal_id}`);
      } else {
        const error = await response.json();
        alert(`Error en l'onboarding: ${error.detail || 'Error desconegut'}`);
      }
    } catch (error) {
      console.error("Error creant el municipi:", error);
    }
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
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} />
          Nou Onboarding
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Nou Onboarding</h2>
                <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">Creació de Municipi + Deal</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Nom de l'Ajuntament</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Ajuntament de Viladecans"
                    value={formData.nom}
                    onChange={e => setFormData({...formData, nom: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Codi INE</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: 08301"
                      value={formData.codi_ine}
                      onChange={e => setFormData({...formData, codi_ine: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Província</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Barcelona"
                      value={formData.provincia}
                      onChange={e => setFormData({...formData, provincia: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Població (Habitants)</label>
                    <input 
                      type="number" 
                      placeholder="Ex: 67000"
                      value={formData.poblacio}
                      onChange={e => setFormData({...formData, poblacio: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                    <label className="block text-[10px] font-black uppercase text-indigo-900 dark:text-indigo-400 mb-1.5 tracking-widest">
                      Pla de Subscripció *
                    </label>
                    <select 
                      required
                      value={formData.pla_saas}
                      onChange={(e) => setFormData({...formData, pla_saas: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-600 shadow-sm"
                    >
                      <option value="Pla de Venda">Pla de Venda</option>
                      <option value="Pla Roure">Pla Roure</option>
                      <option value="Pla Territori">Pla Territori</option>
                      <option value="Pla Mirador">Pla Mirador</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Adreça Física / Seu</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Plaça de la Vila, 1"
                    value={formData.adreca_fisica}
                    onChange={e => setFormData({...formData, adreca_fisica: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex gap-3">
                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Aquesta acció és <strong>atòmica</strong>: crearà automàticament un Deal en estat 'Nou' al Kanban i vincularà el pla seleccionat.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
                >
                  Confirmar Onboarding
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
                    {/* Enllaç al Deal (Relació 1:1: 1 municipi = 1 deal) */}
                    {m.deal?.id ? (
                      <Link 
                        to={`/deals/${m.deal.id}`}
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
                      onClick={() => handleDelete(m.id)}
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

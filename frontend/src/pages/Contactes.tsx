import React from 'react';
import useSWR from 'swr';
import { User, Mail, Phone, MapPin, Search, Plus } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => res.json());

const Contactes: React.FC = () => {
  const { data: contactes, mutate } = useSWR(`${API_BASE}/contactes`, fetcher);
  const { data: municipis } = useSWR(`${API_BASE}/municipis`, fetcher);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<any>(null);
  const [formData, setFormData] = React.useState({ nom: '', email: '', telefon: '', carrec: '', codi_ine_municipi: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      await fetch(`${API_BASE}/contactes/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } else {
      await fetch(`${API_BASE}/contactes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    setIsModalOpen(false);
    setEditingContact(null);
    setFormData({ nom: '', email: '', telefon: '', carrec: '', codi_ine_municipi: '' });
    mutate();
  };

  const handleEdit = (c: any) => {
    setEditingContact(c);
    setFormData({ 
      nom: c.nom, 
      email: c.email, 
      telefon: c.telefon || '', 
      carrec: c.carrec || '', 
      codi_ine_municipi: c.deal?.municipi?.codi_ine || '' 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Segur que vols eliminar aquest contacte?")) {
      await fetch(`${API_BASE}/contactes/${id}`, { method: 'DELETE' });
      mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Agenda de Metadades</h1>
          <p className="text-slate-500 text-sm">Informació de referència vinculada obligatòriament a un Municipi.</p>
        </div>
        <button 
          onClick={() => {
            setEditingContact(null);
            setFormData({ nom: '', email: '', telefon: '', carrec: '', codi_ine_municipi: '' });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nou Contacte
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-4">{editingContact ? 'Editar Contacte' : 'Afegir Nou Contacte'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Nom Complet</label>
                <input 
                  required
                  type="text" 
                  value={formData.nom}
                  onChange={e => setFormData({...formData, nom: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Càrrec</label>
                <input 
                  type="text" 
                  value={formData.carrec}
                  onChange={e => setFormData({...formData, carrec: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Email</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Telèfon</label>
                  <input 
                    type="text" 
                    value={formData.telefon}
                    onChange={e => setFormData({...formData, telefon: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {!editingContact && (
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Municipi Vinculat</label>
                  <select 
                    required
                    value={formData.codi_ine_municipi}
                    onChange={e => setFormData({...formData, codi_ine_municipi: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona un municipi...</option>
                    {municipis?.map((m: any) => (
                      <option key={m.codi_ine} value={m.codi_ine}>{m.nom}</option>
                    ))}
                  </select>
                </div>
              )}
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
                  {editingContact ? 'Actualitzar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          <div key={c.id} className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleEdit(c)}
                className="p-1.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-lg hover:text-indigo-600"
              >
                <User size={14} />
              </button>
              <button 
                onClick={() => handleDelete(c.id)}
                className="p-1.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-lg hover:text-rose-600"
              >
                <Plus size={14} className="rotate-45" />
              </button>
            </div>
            
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

import React from 'react';
import useSWR from 'swr';
import { User, Mail, Phone, MapPin, Search, Plus, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

const Contactes: React.FC = () => {
  const { data: contactes, mutate } = useSWR(`${API_BASE}/contactes`, fetcher);
  const { data: municipis } = useSWR(`${API_BASE}/municipis`, fetcher);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<any>(null);
  const [formData, setFormData] = React.useState({ nom: '', email: '', telefon: '', carrec: '', municipi_id: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingContact ? 'PUT' : 'POST';
    const url = editingContact ? `${API_BASE}/contactes/${editingContact.id}` : `${API_BASE}/contactes`;
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    setIsModalOpen(false);
    setEditingContact(null);
    setFormData({ nom: '', email: '', telefon: '', carrec: '', municipi_id: '' });
    mutate();
  };

  const handleEdit = (c: any) => {
    setEditingContact(c);
    setFormData({ 
      nom: c.nom, 
      email: c.email, 
      telefon: c.telefon || '', 
      carrec: c.carrec || '', 
      municipi_id: c.municipi_id || '' 
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
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Agenda de Contactes</h1>
          <p className="text-slate-500 text-sm">Gestiona els responsables municipals vinculats a cada projecte.</p>
        </div>
        <button 
          onClick={() => {
            setEditingContact(null);
            setFormData({ nom: '', email: '', telefon: '', carrec: '', municipi_id: '' });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} />
          Nou Contacte
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">{editingContact ? 'Editar Contacte' : 'Afegir Nou Contacte'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Nom Complet</label>
                <input required type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Càrrec</label>
                <input type="text" value={formData.carrec} onChange={e => setFormData({...formData, carrec: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-1">Telèfon</label>
                  <input type="text" value={formData.telefon} onChange={e => setFormData({...formData, telefon: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-1">Municipi de Referència</label>
                <select required value={formData.municipi_id} onChange={e => setFormData({...formData, municipi_id: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Selecciona un municipi...</option>
                  {municipis?.map((m: any) => (
                    <option key={m.codi_ine} value={m.codi_ine}>{m.nom}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">Cancel·lar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contactes?.map((c: any) => (
          <div key={c.id} className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <User size={24} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-500 uppercase tracking-tighter">
                <MapPin size={10} />
                {c.municipi?.nom || 'Sense municipi'}
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">{c.nom}</h3>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-4">{c.carrec || 'Càrrec no definit'}</p>
            <div className="space-y-2 pt-4 border-t border-slate-50 dark:border-slate-900 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 truncate">
                <Mail size={14} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{c.email}</span>
              </div>
              {c.telefon && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone size={14} className="text-slate-400 flex-shrink-0" />
                  <span>{c.telefon}</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(c)} className="text-xs font-bold text-slate-500 hover:text-indigo-600">Editar</button>
              <button onClick={() => handleDelete(c.id)} className="text-xs font-bold text-slate-500 hover:text-rose-600">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Contactes;

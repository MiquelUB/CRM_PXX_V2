import React from 'react';
import useSWR from 'swr';
import { User, Mail, Phone, MapPin, Plus, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

const Contactes: React.FC = () => {
  const { data: contactes, mutate } = useSWR(`${API_BASE}/contactes`, fetcher);
  const { data: municipis } = useSWR(`${API_BASE}/municipis`, fetcher);
  const [search, setSearch] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({ nom: '', email: '', telefon: '', carrec: '', municipi_id: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = `${API_BASE}/contactes`;
    
    const payload = {
      nom: formData.nom,
      email: formData.email,
      telefon: formData.telefon || null,
      carrec: formData.carrec || null,
      municipi_id: parseInt(formData.municipi_id)
    };
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setIsModalOpen(false);
    setFormData({ nom: '', email: '', telefon: '', carrec: '', municipi_id: '' });
    mutate();
  };

  const filteredContactes = React.useMemo(() => {
    if (!Array.isArray(contactes)) return [];
    const q = search.toLowerCase();
    return contactes.filter((c: any) => 
      c.nom.toLowerCase().includes(q) ||
      (c.carrec?.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q) ||
      (c.municipi?.nom?.toLowerCase().includes(q))
    );
  }, [contactes, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Agenda de Contactes</h1>
          <p className="text-slate-500 text-sm">Responsables municipals i contactes clau dels projectes.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ nom: '', email: '', telefon: '', carrec: '', municipi_id: '' });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} />
          Nou Contacte
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
        <div className="pl-3 text-slate-400">
          <User size={18} />
        </div>
        <input 
          type="text" 
          placeholder="Cerca per nom, càrrec, municipi o correu..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white py-2"
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">Afegir Nou Contacte</h2>
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
                    <option key={m.id} value={m.id}>{m.nom}</option>
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

      {/* Llista en format Taula / Single Line */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Nom i Cognoms</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Càrrec</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Municipi</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Correu electrònic</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-wider">Telèfon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {filteredContactes.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-indigo-950/20 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    {c.nom}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">{c.carrec || '—'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-sm">
                    <MapPin size={14} className="text-slate-300" />
                    {c.municipi?.nom || '—'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm truncate max-w-[200px]">
                    <Mail size={14} className="text-slate-300" />
                    {c.email}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                  {c.telefon ? (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-300" />
                      {c.telefon}
                    </div>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredContactes.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            No s'han trobat contactes amb aquests criteris.
          </div>
        )}
      </div>
    </div>
  );
};

export default Contactes;

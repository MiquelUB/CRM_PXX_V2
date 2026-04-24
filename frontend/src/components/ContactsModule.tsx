import React, { useState } from 'react';
import { useDeal } from '../context/DealContext';
import { User, Mail, Phone, Plus, X, Loader2 } from 'lucide-react';

const ContactsModule: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telefon: '',
    carrec: ''
  });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal?.municipi) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/contactes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          municipi_id: deal.municipi.codi_ine // Injectem el municipi_id del Deal actual
        })
      });
      
      if (response.ok) {
        await refreshDeal();
        setIsAdding(false);
        setFormData({ nom: '', email: '', telefon: '', carrec: '' });
      }
    } catch (error) {
      console.error("Error afegint contacte:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!deal?.municipi) return null;

  const contactes = deal.municipi.contactes || [];

  return (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4 mb-2">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
          <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg"><User size={20} className="text-indigo-600" /></div>
          <h3 className="font-bold">Contactes Municipals</h3>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
        >
          {isAdding ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddContact} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <h4 className="text-xs font-black uppercase text-slate-500">Nou Contacte</h4>
          <input 
            required
            placeholder="Nom complet"
            value={formData.nom}
            onChange={e => setFormData({...formData, nom: e.target.value})}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input 
            placeholder="Càrrec (ex: Secretari)"
            value={formData.carrec}
            onChange={e => setFormData({...formData, carrec: e.target.value})}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input 
              required
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input 
              placeholder="Telèfon"
              value={formData.telefon}
              onChange={e => setFormData({...formData, telefon: e.target.value})}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button 
            type="submit"
            disabled={isSaving}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Contacte'}
          </button>
        </form>
      )}

      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
        {contactes.length === 0 ? (
          <p className="text-slate-400 text-sm italic text-center py-4">No hi ha contactes vinculats.</p>
        ) : (
          contactes.map(c => (
            <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{c.nom}</p>
                  <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{c.carrec || 'Sense càrrec'}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail size={12} />
                  <span className="truncate">{c.email}</span>
                </div>
                {c.telefon && (
                  <div className="flex items-center gap-2">
                    <Phone size={12} />
                    <span>{c.telefon}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactsModule;

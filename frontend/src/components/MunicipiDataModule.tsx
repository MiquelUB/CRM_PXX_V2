import React, { useState, useEffect } from 'react';
import { useDeal } from '../context/DealContext';
import { MapPin, Mail, Phone, Users, Save, Edit3, Loader2 } from 'lucide-react';

const MunicipiDataModule: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    provincia: '',
    poblacio: 0,
    adreça: '',
    email_general: '',
    telefon_general: ''
  });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (deal?.municipi) {
      setFormData({
        nom: deal.municipi.nom || '',
        provincia: deal.municipi.provincia || '',
        poblacio: deal.municipi.poblacio || 0,
        adreça: deal.municipi.adreça || '',
        email_general: deal.municipi.email_general || '',
        telefon_general: deal.municipi.telefon_general || ''
      });
    }
  }, [deal]);

  const handleSave = async () => {
    if (!deal?.municipi) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/municipis/${deal.municipi.codi_ine}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await refreshDeal();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error actualitzant dades del municipi:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!deal?.municipi) return null;

  return (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
          <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg"><MapPin size={20} className="text-indigo-600" /></div>
          <h3 className="font-bold">Dades del Municipi</h3>
        </div>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors text-slate-500"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : (isEditing ? <Save size={18} className="text-emerald-600" /> : <Edit3 size={18} />)}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nom Oficial</label>
          {isEditing ? (
            <input 
              type="text" 
              value={formData.nom}
              onChange={e => setFormData({...formData, nom: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none text-sm"
            />
          ) : (
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{formData.nom}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Província</label>
            {isEditing ? (
              <input 
                type="text" 
                value={formData.provincia}
                onChange={e => setFormData({...formData, provincia: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none text-sm"
              />
            ) : (
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{formData.provincia || 'N/A'}</p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Habitants</label>
            {isEditing ? (
              <input 
                type="number" 
                value={formData.poblacio}
                onChange={e => setFormData({...formData, poblacio: parseInt(e.target.value)})}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none text-sm"
              />
            ) : (
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                <Users size={14} className="text-slate-400" />
                {formData.poblacio?.toLocaleString() || '0'} hab.
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Adreça General</label>
            {isEditing ? (
              <input 
                type="text" 
                value={formData.adreça}
                onChange={e => setFormData({...formData, adreça: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none text-sm"
                placeholder="Ex: Plaça de la Vila, 1"
              />
            ) : (
              <p className="text-sm text-slate-700 dark:text-slate-300 italic">{formData.adreça || 'Adreça no registrada'}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} className="text-slate-400" />
              {isEditing ? (
                <input 
                  type="email" 
                  value={formData.email_general}
                  onChange={e => setFormData({...formData, email_general: e.target.value})}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 outline-none"
                  placeholder="ajuntament@domini.cat"
                />
              ) : (
                <span className="text-indigo-600 dark:text-indigo-400 truncate">{formData.email_general || 'Email no definit'}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-slate-400" />
              {isEditing ? (
                <input 
                  type="text" 
                  value={formData.telefon_general}
                  onChange={e => setFormData({...formData, telefon_general: e.target.value})}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 outline-none"
                  placeholder="93..."
                />
              ) : (
                <span className="text-slate-700 dark:text-slate-300">{formData.telefon_general || 'Telèfon no definit'}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MunicipiDataModule;

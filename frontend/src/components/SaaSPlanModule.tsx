import React, { useState, useEffect } from 'react';
import { useDeal } from '../context/DealContext';
import { Package, Edit3, Save, Loader2 } from 'lucide-react';

const SaaSPlanModule: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [planData, setPlanData] = useState({
    pla_tipus: 'roure',
    preu_acordat: 0
  });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (deal) {
      setPlanData({
        pla_tipus: deal.pla_tipus || 'roure',
        preu_acordat: deal.preu_acordat || 0
      });
    }
  }, [deal]);

  const handleSave = async () => {
    if (!deal) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/deals/${deal.id}/pla-saas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      });
      if (response.ok) {
        await refreshDeal();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error actualitzant el pla SaaS:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getColorClass = () => {
    switch(planData.pla_tipus) {
      case 'territori': return 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800';
      case 'mirador': return 'text-sky-600 border-sky-200 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-800';
      default: return 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800';
    }
  };

  if (!deal) return null;

  return (
    <div className={`p-4 rounded-xl border transition-all ${getColorClass()}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Package size={20} />
          <h3 className="font-bold text-lg uppercase tracking-tight">Pla {planData.pla_tipus}</h3>
        </div>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className="p-1 hover:bg-white/50 dark:hover:bg-slate-800 rounded transition-colors"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : (isEditing ? <Save size={18} /> : <Edit3 size={18} />)}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase opacity-50 mb-1">Tipus de Pla</label>
          {isEditing ? (
            <select 
              value={planData.pla_tipus}
              onChange={(e) => setPlanData({...planData, pla_tipus: e.target.value})}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 outline-none"
            >
              <option value="roure">Roure</option>
              <option value="mirador">Mirador</option>
              <option value="territori">Territori</option>
            </select>
          ) : (
            <p className="font-bold text-slate-900 dark:text-white capitalize">{planData.pla_tipus}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-black uppercase opacity-50 mb-1">Inversió Anual (Preu Acordat)</label>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={planData.preu_acordat}
                onChange={(e) => setPlanData({...planData, preu_acordat: parseFloat(e.target.value)})}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 outline-none"
              />
              <span className="font-bold">€</span>
            </div>
          ) : (
            <p className="font-bold text-slate-900 dark:text-white text-2xl">{planData.preu_acordat.toLocaleString()} €</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaaSPlanModule;

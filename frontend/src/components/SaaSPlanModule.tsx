import React, { useState, useEffect } from 'react';
import { useDeal } from '../context/DealContext';
import { Package, Edit3, Save, Loader2 } from 'lucide-react';

const SaaSPlanModule: React.FC = () => {
  const { deal, refreshDeal } = useDeal();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [planData, setPlanData] = useState({
    pla_assignat: 'Pla Pro',
    preu_acordat: 0
  });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (deal) {
      setPlanData({
        pla_assignat: deal.pla_assignat || 'Pla Pro',
        preu_acordat: 0 // El preu acordat ara es gestiona via metadata o camp futur
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
        body: JSON.stringify({ pla_assignat: planData.pla_assignat })
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
    const p = planData.pla_assignat?.toLowerCase();
    if (p?.includes('territori')) return 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800';
    if (p?.includes('mirador')) return 'text-sky-600 border-sky-200 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-800';
    return 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800';
  };

  if (!deal) return null;

  return (
    <div className={`p-4 rounded-xl border transition-all ${getColorClass()}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Package size={20} />
          <h3 className="font-bold text-lg uppercase tracking-tight">{planData.pla_assignat}</h3>
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
          <label className="block text-xs font-black uppercase opacity-50 mb-1">Pla Assignat</label>
          {isEditing ? (
            <select 
              value={planData.pla_assignat}
              onChange={(e) => setPlanData({...planData, pla_assignat: e.target.value})}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 outline-none"
            >
              <option value="Pla de Venda">Pla de Venda</option>
              <option value="Pla Roure">Pla Roure</option>
              <option value="Pla Territori">Pla Territori</option>
              <option value="Pla Mirador">Pla Mirador</option>
            </select>
          ) : (
            <p className="font-bold text-slate-900 dark:text-white capitalize">{planData.pla_assignat}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaaSPlanModule;

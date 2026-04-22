import React, { useState, useEffect } from 'react';
import { useDeal } from '../context/DealContext';
import { Package, Edit3, Save } from 'lucide-react';

const SaaSPlanModule: React.FC = () => {
  const { deal } = useDeal();
  const [isEditing, setIsEditing] = useState(false);
  
  // Estats locals per permetre l'edició manual (Flexibilitat Tech Lead)
  const [planData, setPlanData] = useState({
    nom: 'Roure',
    rutes: 5,
    pois: 10,
    preu: 1200
  });

  // Carregar valors per defecte basats en el pla (simulat si el backend no els envia encara)
  useEffect(() => {
    if (deal) {
      // Lògica de plantilla segons el nom del pla
      const defaults = {
        'Roure': { rutes: 5, pois: 10, preu: 1200 },
        'Mirador': { rutes: 10, pois: 20, preu: 2500 },
        'Territori': { rutes: 20, pois: 35, preu: 4800 }
      };
      const currentPlan = (deal.plan_nom as keyof typeof defaults) || 'Roure';
      setPlanData({
        nom: currentPlan,
        ...defaults[currentPlan],
        ...(deal.rutes_limit && { rutes: deal.rutes_limit }),
        ...(deal.pois_limit && { pois: deal.pois_limit }),
        ...(deal.preu_acordat && { preu: deal.preu_acordat })
      });
    }
  }, [deal]);

  const getColorClass = () => {
    switch(planData.nom) {
      case 'Territori': return 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800';
      case 'Mirador': return 'text-sky-600 border-sky-200 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-800';
      default: return 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800';
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all ${getColorClass()}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Package size={20} />
          <h3 className="font-bold text-lg">Pla {planData.nom}</h3>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 hover:bg-white/50 dark:hover:bg-slate-800 rounded transition-colors"
        >
          {isEditing ? <Save size={18} /> : <Edit3 size={18} />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <p className="text-slate-500 dark:text-slate-400">Rutes Max.</p>
          {isEditing ? (
            <input 
              type="number" 
              value={planData.rutes}
              onChange={(e) => setPlanData({...planData, rutes: parseInt(e.target.value)})}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1"
            />
          ) : (
            <p className="font-bold text-slate-900 dark:text-white">{planData.rutes} rutes</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-slate-500 dark:text-slate-400">POIs per ruta</p>
          {isEditing ? (
            <input 
              type="number" 
              value={planData.pois}
              onChange={(e) => setPlanData({...planData, pois: parseInt(e.target.value)})}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1"
            />
          ) : (
            <p className="font-bold text-slate-900 dark:text-white">{planData.pois} POIs</p>
          )}
        </div>
        <div className="col-span-2 space-y-1">
          <p className="text-slate-500 dark:text-slate-400">Preu Acordat</p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={planData.preu}
                onChange={(e) => setPlanData({...planData, preu: parseInt(e.target.value)})}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1"
              />
              <span className="font-bold">€</span>
            </div>
          ) : (
            <p className="font-bold text-slate-900 dark:text-white text-xl">{planData.preu} €</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaaSPlanModule;

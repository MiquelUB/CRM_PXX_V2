import React from 'react';
import { useDeal } from '../context/DealContext';
import SaaSPlanModule from '../components/SaaSPlanModule';
import UnifiedTimeline from '../components/UnifiedTimeline';
import { 
  MapPin, 
  User, 
  PlusCircle, 
  Bot, 
  Info 
} from 'lucide-react';

const DealDetail: React.FC = () => {
  const { deal, isLoading, error } = useDeal();

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">Error carregant el Deal.</div>;
  if (!deal) return <div className="p-4 bg-amber-50 text-amber-600 rounded-lg">No s'ha trobat el Deal.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest">ID #{deal.id}</span>
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold uppercase">
              {deal.estat}
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {deal.municipi?.nom || deal.titol}
          </h1>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <PlusCircle size={18} />
            Acció Ràpida
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Columna Esquerra: Dades Base (4/12) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Card Municipi */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-slate-900 dark:text-white">
              <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg"><MapPin size={20} /></div>
              <h3 className="font-bold">Municipi</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{deal.municipi?.nom || 'Municipi no trobat'}</p>
                <p className="text-sm text-slate-500 font-medium">Província: {deal.municipi?.provincia || 'N/A'}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-900 flex justify-between text-sm">
                <span className="text-slate-500">Població (Idescat)</span>
                <span className="font-bold">{deal.municipi?.poblacio?.toLocaleString() || 'N/A'} hab.</span>
              </div>
            </div>
          </div>

          {/* Card Contacte */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-slate-900 dark:text-white">
              <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg"><User size={20} /></div>
              <h3 className="font-bold">Contacte Principal</h3>
            </div>
            {deal.contactes && deal.contactes.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xl font-bold">{deal.contactes[0].nom}</p>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{deal.contactes[0].carrec || 'Càrrec no especificat'}</p>
                </div>
                <div className="pt-3 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-slate-600 dark:text-slate-400 underline decoration-slate-300">{deal.contactes[0].email}</p>
                  {deal.contactes[0].telefon && <p className="font-medium">{deal.contactes[0].telefon}</p>}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic">No hi ha contactes vinculats.</p>
            )}
          </div>

          {/* Mòdul SaaS Plan */}
          <SaaSPlanModule />

          {/* Botó Kimi (IA Agent) */}
          <button className="w-full p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-xl">
            <Bot size={24} />
            Preguntar a Kimi k2.5
          </button>
        </div>

        {/* Columna Dreta: Timeline (8/12) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Info size={20} className="text-indigo-600" />
              Diari d'Abord (Timeline)
            </h2>
          </div>

          <UnifiedTimeline />
        </div>
      </div>
    </div>
  );
};

export default DealDetail;

import React from 'react';
import { useDeal } from '../context/DealContext';
import SaaSPlanModule from '../components/SaaSPlanModule';
import MunicipiDataModule from '../components/MunicipiDataModule';
import ContactsModule from '../components/ContactsModule';
import UnifiedTimeline from '../components/UnifiedTimeline';
import KimiChatDrawer from '../components/KimiChatDrawer';
import { 
  MapPin, 
  User, 
  PlusCircle, 
  Bot, 
  Info 
} from 'lucide-react';

const DealDetail: React.FC = () => {
  const { deal, isLoading, error } = useDeal();
  const [isChatOpen, setIsChatOpen] = React.useState(false);

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
          
          {/* Bloc 1: Dades del Municipi */}
          <MunicipiDataModule />

          {/* Bloc 2: Contactes */}
          <ContactsModule />

          {/* Bloc 3: Mòdul SaaS Plan */}
          <SaaSPlanModule />

          {/* Botó Kimi (IA Agent) */}
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-full p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-xl"
          >
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

      {/* Drawer del Xat IA */}
      <KimiChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default DealDetail;

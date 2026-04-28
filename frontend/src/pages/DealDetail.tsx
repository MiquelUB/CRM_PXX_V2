import React, { useState } from 'react';
import { useDeal } from '../context/DealContext';
import SaaSPlanModule from '../components/SaaSPlanModule';
import MunicipiDataModule from '../components/MunicipiDataModule';
import ContactsModule from '../components/ContactsModule';
import UnifiedTimeline from '../components/UnifiedTimeline';
import ProperesAccions from '../components/ProperesAccions';
import MunicipalityContextModule from '../components/MunicipalityContextModule';
import KimiChatIntegrated from '../components/KimiChatIntegrated';
import { 
  Users, 
  Map, 
  X,
  FileText
} from 'lucide-react';

const DealDetail: React.FC = () => {
  const { deal, isLoading, error } = useDeal();
  const [activeModal, setActiveModal] = useState<'contacts' | 'municipi' | 'task' | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;
  if (error) return <div className="p-8 bg-red-50 text-red-600 rounded-xl m-4 font-bold">Error en la càrrega de l'Epicentre.</div>;
  if (!deal) return <div className="p-8 bg-amber-50 text-amber-600 rounded-xl m-4">No hi ha dades del Deal.</div>;

  const closeModal = () => {
    setActiveModal(null);
    setSelectedTask(null);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      
      {/* 1. CAPÇALERA FIXA (INSTITUCIONAL) */}
      <header className="flex justify-between items-center bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded text-[9px] font-black uppercase tracking-widest">
              {deal.estat_kanban}
            </span>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {deal.municipi?.nom}
            </h1>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            Pla Assignat: <span className="text-indigo-600 dark:text-indigo-400">{deal.pla_saas || 'Sense definir'}</span>
          </p>
        </div>
        
        {/* Botons de Dades (Minimalistes) */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveModal('contacts')}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95"
          >
            <Users size={14} className="text-indigo-600" />
            Contactes
          </button>
          <button 
            onClick={() => setActiveModal('municipi')}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95"
          >
            <Map size={14} className="text-indigo-600" />
            Municipi
          </button>
        </div>
      </header>

      {/* 2. LAYOUT 60/40 (GRID TAILWIND) */}
      <div className="grid grid-cols-10 gap-8">
        
        {/* COLUMNA ESQUERRA: L'ACCIÓ (60%) */}
        <div className="col-span-10 lg:col-span-6 space-y-8">
          
          {/* Properes Accions (Checklist) */}
          <section className="space-y-3">
            <div className="px-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <FileText size={12} /> Llista d'Execució
            </div>
            <ProperesAccions onTaskClick={(task: any) => {
              setSelectedTask(task);
              setActiveModal('task');
            }} />
          </section>

          {/* Diari d'Abord (Timeline) */}
          <section className="space-y-3">
            <div className="px-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
               Diari d'Abord
            </div>
            <UnifiedTimeline />
          </section>
        </div>

        {/* COLUMNA DRETA: L'ESTRATÈGIA (40%) */}
        <div className="col-span-10 lg:col-span-4 space-y-8">
          <KimiChatIntegrated />
          
          {/* SaaS Plan (Configuració ràpida) */}
          <SaaSPlanModule />
        </div>
      </div>

      {/* 3. CONTEXT LOCAL IA (AL FONS) */}
      <div className="pt-12 border-t border-slate-100 dark:border-slate-900">
        <div className="max-w-2xl mx-auto opacity-50 hover:opacity-100 transition-opacity">
          <MunicipalityContextModule />
        </div>
      </div>

      {/* --- MODALS --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-950 z-10">
              <h3 className="font-black text-xs uppercase tracking-widest">
                {activeModal === 'contacts' && 'Directori de Contactes'}
                {activeModal === 'municipi' && 'Dades del Municipi'}
                {activeModal === 'task' && 'Detall de la Tasca'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {activeModal === 'contacts' && <ContactsModule />}
              {activeModal === 'municipi' && <MunicipiDataModule />}
              {activeModal === 'task' && selectedTask && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase text-indigo-600 mb-1">{selectedTask.tipus}</p>
                    <h4 className="text-xl font-bold">{selectedTask.contingut}</h4>
                    <p className="text-xs text-slate-500 mt-2">
                      Programat per: {new Date(selectedTask.data).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    Aquí podràs editar els detalls de la tasca en el proper refactor de CRUD d'accions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DealDetail;

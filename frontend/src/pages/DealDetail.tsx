import React, { useState, useEffect } from 'react';
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
  FileText,
  Copy,
  Check,
  Loader2,
  Trash
} from 'lucide-react';

const DealDetail: React.FC = () => {
  const { deal, refreshDeal, isLoading, error } = useDeal();
  const [activeModal, setActiveModal] = useState<'contacts' | 'municipi' | 'task' | 'interaction' | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (selectedTask) {
      setModalTitle(selectedTask.contingut || '');
      setModalContent(selectedTask.metadata_json?.descripcio || selectedTask.descripcio || '');
    } else if (selectedInteraction) {
      setModalTitle(selectedInteraction.metadata_json?.titol || '');
      setModalContent(selectedInteraction.contingut || '');
    }
  }, [selectedTask, selectedInteraction]);

  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>;
  if (error) return <div className="p-8 bg-red-50 text-red-600 rounded-xl m-4 font-bold">Error en la càrrega de l'Epicentre.</div>;
  if (!deal) return <div className="p-8 bg-amber-50 text-amber-600 rounded-xl m-4">No hi ha dades del Deal.</div>;

  const closeModal = () => {
    setActiveModal(null);
    setSelectedTask(null);
    setSelectedInteraction(null);
    setModalTitle('');
    setModalContent('');
    setShowDeleteConfirm(false);
    setCopied(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateContent = async (id: number) => {
    setIsUpdating(true);
    try {
      let payload: any = {};
      
      if (selectedTask) {
        payload = {
          contingut: modalTitle,
          metadata_json: { 
            ...(selectedTask.metadata_json || {}),
            descripcio: modalContent 
          }
        };
      } else {
        payload = {
          contingut: modalContent,
          metadata_json: {
            ...(selectedInteraction.metadata_json || {}),
            titol: modalTitle
          }
        };
      }

      const response = await fetch(`${API_BASE}/interaccions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        await refreshDeal();
        closeModal();
      }
    } catch (err) {
      console.error("Error al guardar els canvis:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/interaccions/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await refreshDeal();
        closeModal();
      }
    } catch (err) {
      console.error("Error al borrar el registre:", err);
    } finally {
      setIsDeleting(false);
    }
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

      {/* 2. LAYOUT 60/40 */}
      <div className="grid grid-cols-10 gap-8">
        <div className="col-span-10 lg:col-span-6 space-y-8">
          <section className="space-y-3">
            <div className="px-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <FileText size={12} /> Llista d'Execució
            </div>
            <ProperesAccions onTaskClick={(task: any) => {
              setSelectedTask(task);
              setActiveModal('task');
            }} />
          </section>

          <section className="space-y-3">
            <div className="px-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
               Diari d'Abord
            </div>
            <UnifiedTimeline onEntryClick={(entry: any) => {
              setSelectedInteraction(entry);
              setActiveModal('interaction');
            }} />
          </section>
        </div>

        <div className="col-span-10 lg:col-span-4 space-y-8">
          <KimiChatIntegrated />
          <SaaSPlanModule />
        </div>
      </div>

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
                {activeModal === 'task' && 'Edició de l\'Acció'}
                {activeModal === 'interaction' && 'Edició del Diari'}
              </h3>
              <div className="flex items-center gap-2">
                {(activeModal === 'task' || activeModal === 'interaction') && !showDeleteConfirm && (
                  <button 
                    onClick={() => handleUpdateContent(selectedTask?.id || selectedInteraction?.id)}
                    disabled={isUpdating}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={12} className="animate-spin" /> : 'Guardar Canvis'}
                  </button>
                )}
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {activeModal === 'contacts' && <ContactsModule />}
              {activeModal === 'municipi' && <MunicipiDataModule />}
              
              {(activeModal === 'task' || activeModal === 'interaction') && (
                <div className="space-y-6">
                  {showDeleteConfirm ? (
                    <div className="p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto">
                        <Trash size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase text-red-600 tracking-widest">Confirmar Eliminació</h4>
                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">Aquesta acció és permanent i no es pot desfer.</p>
                      </div>
                      <div className="flex justify-center gap-3 pt-2">
                        <button 
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 text-[10px] font-black uppercase text-slate-500 hover:text-slate-700"
                        >
                          Cancel·lar
                        </button>
                        <button 
                          onClick={() => handleDelete(selectedTask?.id || selectedInteraction?.id)}
                          disabled={isDeleting}
                          className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {isDeleting && <Loader2 size={12} className="animate-spin" />}
                          Eliminar Registre
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Títol de l'entrada */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Títol del registre</label>
                        <input 
                          type="text"
                          value={modalTitle}
                          onChange={(e) => setModalTitle(e.target.value)}
                          placeholder="Títol o resum..."
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </div>

                      {/* Contingut/Descripció */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Cos del registre / Descripció</label>
                          <button 
                            onClick={() => handleCopy(modalContent)}
                            className="text-[9px] font-bold uppercase text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            {copied ? <Check size={10} /> : <Copy size={10} />}
                            {copied ? 'Copiat' : 'Copiar'}
                          </button>
                        </div>
                        <textarea 
                          value={modalContent}
                          onChange={(e) => setModalContent(e.target.value)}
                          placeholder="Escriu els detalls aquí..."
                          className="w-full min-h-[300px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                        />
                      </div>

                      {/* Botó de Borrar (al fons) */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center">
                        <p className="text-[9px] text-slate-400 font-bold uppercase italic">
                          Tipus: {selectedTask?.tipus || selectedInteraction?.tipus} | {new Date(selectedTask?.data || selectedInteraction?.data).toLocaleString()}
                        </p>
                        <button 
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-red-500 hover:text-red-700 text-[10px] font-black uppercase transition-colors"
                        >
                          <Trash size={14} />
                          Borrar Registre
                        </button>
                      </div>
                    </div>
                  )}
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

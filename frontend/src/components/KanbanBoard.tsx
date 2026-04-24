import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { User, MapPin } from 'lucide-react';

interface DealSnippet {
  id: number;
  titol: string;
  estat: string;
  municipi: { nom: string };
  contactes: { nom: string }[];
  plan_nom?: string;
}

interface KanbanData {
  [key: string]: DealSnippet[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => res.json());

const KanbanBoard: React.FC = () => {
  const { data, mutate } = useSWR<KanbanData>(`${API_BASE}/deals/kanban`, fetcher);
  const navigate = useNavigate();

  const columns = ["prospecte", "contactat", "reunio", "tancat"];

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // ACTUALITZACIÓ OPTIMISTA (Tech Lead 1%)
    const dealId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    
    // Crear una copia de les dades per a la mutació local
    const newData = { ...data };
    const sourceCol = [...(newData[source.droppableId] || [])];
    const destCol = [...(newData[destination.droppableId] || [])];
    
    const [movedDeal] = sourceCol.splice(source.index, 1);
    movedDeal.estat = newStatus;
    destCol.splice(destination.index, 0, movedDeal);
    
    newData[source.droppableId] = sourceCol;
    newData[destination.droppableId] = destCol;

    // Aplicar canvi local immediatament
    mutate(newData, false);

    // Crida al backend
    try {
      await fetch(`${API_BASE}/deals/${dealId}/estat`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estat: newStatus })
      });
      mutate(); // Revalidar per confirmar
    } catch (error) {
      console.error("Error al moure el deal:", error);
      mutate(); // Revertir en cas d'error
    }
  };

  const getPlanBadge = (plan?: string) => {
    const colors: any = {
      'Territori': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      'Mirador': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
      'Roure': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    };
    return colors[plan || 'Roure'] || colors['Roure'];
  };

  if (!data) return <div className="h-64 flex items-center justify-center">Carregant Pipeline...</div>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {columns.map(colId => (
          <div key={colId} className="flex flex-col min-w-[280px]">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500">{colId}</h3>
              <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {data[colId]?.length || 0}
              </span>
            </div>

            <Droppable droppableId={colId}>
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`flex-1 p-2 rounded-xl transition-colors min-h-[500px] ${
                    snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'bg-slate-100/50 dark:bg-slate-950/50'
                  }`}
                >
                  {data[colId]?.map((deal, index) => (
                    <Draggable key={deal.id.toString()} draggableId={deal.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => navigate(`/deals/${deal.id}`)}
                          className={`bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-3 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-all ${
                            snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500 scale-105' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${getPlanBadge(deal.plan_nom)}`}>
                              {deal.plan_nom || 'Roure'}
                            </span>
                          </div>
                          
                          <h4 className="font-bold text-slate-900 dark:text-white leading-tight mb-3">
                            {deal.titol}
                          </h4>

                          <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-indigo-500" />
                              <span className="truncate">{deal.municipi?.nom || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User size={12} className="text-slate-400" />
                              <span className="truncate">
                                {deal.contactes?.[0]?.nom || 'Sense contacte'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;

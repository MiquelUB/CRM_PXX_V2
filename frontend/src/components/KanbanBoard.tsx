import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { User, MapPin } from 'lucide-react';

interface DealSnippet {
  id: number;
  estat_kanban: string;
  pla_assignat: string;
  municipi: { 
    nom: string;
  };
  contactes?: { nom: string }[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

const KanbanBoard: React.FC = () => {
  const { data: rawDeals, mutate } = useSWR<DealSnippet[]>(`${API_BASE}/deals/kanban`, fetcher);
  const navigate = useNavigate();

  const columns = ["NOU", "CONTACTAT", "DEMO", "PROPOSTA", "TANCAT"];

  // Grup dades per columnes
  const data = useMemo(() => {
    const board: { [key: string]: DealSnippet[] } = {
      "NOU": [], "CONTACTAT": [], "DEMO": [], "PROPOSTA": [], "TANCAT": []
    };
    if (rawDeals) {
      rawDeals.forEach(deal => {
        const status = deal.estat_kanban?.toUpperCase() || "NOU";
        if (board[status]) {
          board[status].push(deal);
        } else {
          board["NOU"].push(deal);
        }
      });
    }
    return board;
  }, [rawDeals]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const dealId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    
    // Per a l'actualització optimista amb la llista plana, és una mica més complex, 
    // però podem fer el mutate amb les dades que esperem del backend després
    const statusMapping: { [key: string]: string } = {
      "NOU": "Nou",
      "CONTACTAT": "Contactat",
      "DEMO": "Demo",
      "PROPOSTA": "Proposta",
      "TANCAT": "Tancat"
    };
    const estatBackend = statusMapping[newStatus.toUpperCase()] || "Nou";

    try {
      await fetch(`${API_BASE}/deals/${dealId}/estat`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estat_kanban: estatBackend })
      });
      mutate();
    } catch (error) {
      console.error("Error al moure el deal:", error);
      mutate();
    }
  };

  const getPlanBadge = (plan?: string) => {
    const p = plan?.toLowerCase();
    const colors: any = {
      'territori': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      'mirador': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
      'roure': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    };
    return colors[p || 'roure'] || colors['roure'];
  };

  if (!rawDeals) return <div className="h-64 flex items-center justify-center">Carregant Pipeline...</div>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {columns.map(colId => (
          <div key={colId} className="flex flex-col min-w-[280px]">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="font-bold uppercase text-[10px] tracking-widest text-slate-500">{colId}</h3>
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
                  {data[colId].map((deal, index) => (
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
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${getPlanBadge(deal.pla_assignat)}`}>
                              {deal.pla_assignat || 'Pla Pro'}
                            </span>
                          </div>
                          
                          <h4 className="font-bold text-slate-900 dark:text-white leading-tight mb-3">
                            {deal.municipi?.nom}
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

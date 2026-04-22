import React from 'react';
import KanbanBoard from '../components/KanbanBoard';
import CalendarPanel from '../components/CalendarPanel';

const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header del Dashboard */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm">Benvingut al centre de control del CRM PXX v2.</p>
        </div>
      </div>

      {/* Main Grid: Kanban + Calendar */}
      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Kanban Board (8/12) */}
        <div className="col-span-12 xl:col-span-8 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
            <h3 className="font-bold text-slate-900 dark:text-white">Pipeline Comercial</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <KanbanBoard />
          </div>
        </div>

        {/* Sidebar: Calendar (4/12) */}
        <div className="col-span-12 xl:col-span-4 h-[600px] xl:h-auto">
          <CalendarPanel />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

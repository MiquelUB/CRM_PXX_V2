import React from 'react';
import { useDeal } from '../context/DealContext';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Calendar, 
  User, 
  Clock 
} from 'lucide-react';

const UnifiedTimeline: React.FC = () => {
  const { deal } = useDeal();

  if (!deal?.interaccions || deal.interaccions.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        <p className="text-slate-500">No hi ha interaccions registrades.</p>
      </div>
    );
  }

  // Ordenar cronològicament (més recent primer)
  const sortedInteraccions = [...deal.interaccions].sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  const getIcon = (tipus: string) => {
    switch (tipus) {
      case 'email_in':
      case 'email_out': return <Mail size={16} className="text-blue-500" />;
      case 'trucada': return <Phone size={16} className="text-indigo-500" />;
      case 'reunio': return <Calendar size={16} className="text-emerald-500" />;
      default: return <MessageSquare size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {sortedInteraccions.map((item) => (
        <div key={item.id} className="relative pl-10 group">
          {/* Dot i Icona */}
          <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center z-10 group-hover:border-indigo-500 transition-colors">
            {getIcon(item.tipus)}
          </div>

          {/* Card d'interacció */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {item.tipus.replace('_', ' ')}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <User size={12} />
                  <span>{item.autor || 'Sistema'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock size={12} />
                <span>{new Date(item.data).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {item.contingut}
            </div>

            {item.data_fi && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-900 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 italic">
                <Calendar size={12} />
                <span>Finalització programada: {new Date(item.data_fi).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UnifiedTimeline;

import React from 'react';
import useSWR from 'swr';
import { Mail, Briefcase, Calendar, User, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error HTTP: ${res.status}`);
  }
  return res.json();
};

const Emails: React.FC = () => {
  const { data: emails, error, isLoading } = useSWR(`${API_BASE}/emails`, fetcher);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-slate-500 font-medium animate-pulse">Carregant correus...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex flex-col items-center justify-center h-64 text-center">
        <span className="text-4xl mb-4">🚨</span>
        <h3 className="text-lg font-bold mb-2">Error de Connexió</h3>
        <p className="text-sm opacity-80 max-w-md">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Mail className="text-indigo-600" size={36} />
            Bústia de Correus
          </h1>
          <p className="text-slate-500 mt-2">
            Registre global de tots els correus enviats i rebuts vinculats a projectes.
          </p>
        </div>
      </header>

      {/* Llistat de Correus */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4 font-bold w-16">Tipus</th>
                <th className="px-6 py-4 font-bold">Assumpte / Contingut</th>
                <th className="px-6 py-4 font-bold">Deal (Projecte)</th>
                <th className="px-6 py-4 font-bold">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {emails && emails.length > 0 ? (
                emails.map((email: any) => {
                  const isOut = email.tipus === 'email_out';
                  const assumpte = email.contingut.split('\\n')[0].replace('Assumpte:', '').trim() || 'Sense assumpte';
                  
                  return (
                    <tr 
                      key={email.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors"
                    >
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex p-2 rounded-full ${isOut ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'}`}>
                          {isOut ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{assumpte}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <User size={12} />
                            {email.autor || (isOut ? 'Equip' : 'Client')}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {email.deal ? (
                          <Link 
                            to={`/deals/${email.deal_id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Briefcase size={12} />
                            {email.deal.titol}
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-sm italic">No vinculat</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar size={14} />
                            {new Date(email.data).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-slate-400 ml-5 mt-0.5">
                            {new Date(email.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No hi ha correus registrats a la base de dades.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Emails;

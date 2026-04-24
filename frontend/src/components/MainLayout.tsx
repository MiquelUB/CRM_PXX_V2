import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  MapPin, 
  Users, 
  CreditCard, 
  Settings, 
  Moon, 
  Sun,
  Mail
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MainLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/deals', icon: <Briefcase size={20} />, label: 'Deals' },
    { to: '/municipis', icon: <MapPin size={20} />, label: 'Municipis' },
    { to: '/contactes', icon: <Users size={20} />, label: 'Contactes' },
    { to: '/pagaments', icon: <CreditCard size={20} />, label: 'Pagaments' },
    { to: '/configuracio', icon: <Settings size={20} />, label: 'Configuració' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">CRM PXX v2</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Mode Fosc' : 'Mode Clar'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;

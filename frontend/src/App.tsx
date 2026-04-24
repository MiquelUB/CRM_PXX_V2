import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DealProvider } from './context/DealContext';
import MainLayout from './components/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import DealDetail from './pages/DealDetail';
import Municipis from './pages/Municipis';
import Contactes from './pages/Contactes';
import Deals from './pages/Deals';
import Emails from './pages/Emails';

// Pàgines temporals
const Placeholder = ({ title }: { title: string }) => (
  <div className="max-w-4xl">
    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{title}</h2>
    <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center">
      <p className="text-slate-500 font-medium">Aquesta secció es troba en fase de construcció.</p>
      <p className="text-slate-400 text-sm mt-2">Fase 4: Entitats Secundàries.</p>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="deals" element={<Deals />} />
              <Route 
                path="deals/:id" 
                element={
                  <DealProvider>
                    <DealDetail />
                  </DealProvider>
                } 
              />
              <Route path="municipis" element={<Municipis />} />
              <Route path="contactes" element={<Contactes />} />
              <Route path="pagaments" element={<Placeholder title="Pagaments" />} />
              <Route path="configuracio" element={<Placeholder title="Configuració" />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

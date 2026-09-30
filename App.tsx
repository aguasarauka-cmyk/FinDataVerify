
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import ManualSearch from './components/ManualSearch';
import { FinancialDocument, ViewState } from './types';

const App: React.FC = () => {
  const [selectedDocument, setSelectedDocument] = useState<FinancialDocument | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  return (
    <div className="flex bg-slate-950 min-h-screen font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden relative">
      {/* Fixed Background Gradients for atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[120px]" />
      </div>

      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      
      {/* Main Content Wrapper - Adjusted margins for mobile */}
      <main className="flex-1 w-full md:ml-[4.5rem] relative z-10 transition-all duration-300">
        {['dashboard', 'important', 'archived'].includes(currentView) && (
            <Dashboard 
                onSelectDocument={setSelectedDocument} 
                currentView={currentView}
            />
        )}
        {currentView === 'manual_search' && <ManualSearch />}
        
        {/* Placeholder para Settings si fuera necesario en el futuro */}
        {currentView === 'settings' && (
           <div className="p-8 text-white">
             <h2 className="text-2xl font-bold">Configuración</h2>
             <p className="text-slate-500 mt-4">Módulo en construcción...</p>
           </div>
        )}
      </main>

      {/* Workspace Overlay - Prioridad Alta (Cubre cualquier vista si hay documento seleccionado) */}
      <AnimatePresence>
        {selectedDocument && (
          <Workspace 
            document={selectedDocument} 
            onClose={() => setSelectedDocument(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

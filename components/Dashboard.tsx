import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Download, 
  Landmark, 
  ArrowUpRight,
  Database,
  Wifi,
  WifiOff,
  User,
  Users,
  CalendarDays,
  Search,
  FileText,
  X,
  Eye,
  Filter,
  Network,
  Link,
  Minus,
  Plus,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { FinancialDocument } from '../types';

interface DashboardProps {
    onSelectDocument: (doc: FinancialDocument) => void;
    currentView?: string;
}

/**
 * Función auxiliar para transformar URLs de Google Drive en versiones "embed" (preview).
 * Extrae el ID del archivo y reconstruye la URL para evitar bloqueos X-Frame-Options.
 */
const getEmbedUrl = (url: string | null) => {
  if (!url) return '';
  
  if (url.includes('drive.google.com')) {
    // Intenta encontrar el ID en la ruta (/d/ID)
    let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    
    // Si no, intenta encontrarlo en los parámetros (id=ID)
    if (!match) {
      match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    }

    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  
  return url;
};

const Dashboard: React.FC<DashboardProps> = ({ onSelectDocument, currentView }) => {
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('--:--');
  
  // UI States
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [pdfZoom, setPdfZoom] = useState(1); // Zoom state for PDF Viewer
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [filterDate, setFilterDate] = useState(''); // Filtro de fecha para Backend

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      // Se pasa el filtro de fecha al backend
      const data = await api.getDocuments({ 
          fecha_inicio: filterDate 
      });
      setDocuments(data);
      setLastSync(new Date().toLocaleTimeString());
      if (data.length > 0 && data[0].bankName.includes("DEMO")) setError(true);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDate]); // Recargar cuando cambia la fecha (filtro backend)

  // Reset zoom when opening a new PDF
  useEffect(() => {
    if (previewPdfUrl) {
        setPdfZoom(1);
    }
  }, [previewPdfUrl]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Logic for filtering based on currentView
      if (currentView === 'dashboard') {
          // Dashboard shows only active (not completed) documents
          if (doc.es_completado) return false;
      } else if (currentView === 'archived') {
          // Archived shows only completed documents
          if (!doc.es_completado) return false;
      } else if (currentView === 'important') {
          // Important view
          if (!doc.es_importante) return false;
      }

      const matchSearch = searchTerm === '' || 
        doc.primaryHolder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.secondaryHolder || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.endingBalance.toString().includes(searchTerm) ||
        (doc.address_search_text || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchBank = selectedBank === '' || doc.bankName === selectedBank;
      
      return matchSearch && matchBank;
    });
  }, [documents, searchTerm, selectedBank, currentView]);

  const banks = useMemo(() => {
    const set = new Set(documents.map(d => d.bankName));
    return Array.from(set).sort();
  }, [documents]);

  // --- LÓGICA DE DETECCIÓN DE CONEXIONES (GRAPH ANALYSIS) ---
  const connectionAnalysis = useMemo(() => {
    // Retorna un Map: ID -> Número de Conexiones
    const map = new Map<number, number>();
    
    // Mapas de frecuencia
    const holders: Record<string, number> = {};
    const addresses: Record<string, number> = {};

    // Paso 1: Contar ocurrencias
    documents.forEach(doc => {
        const h = doc.primaryHolder.trim().toLowerCase();
        const a = doc.address_search_text ? doc.address_search_text.trim().toLowerCase() : '';
        
        if (h) holders[h] = (holders[h] || 0) + 1;
        // Solo consideramos direcciones significativas (>5 caracteres)
        if (a && a.length > 5) addresses[a] = (addresses[a] || 0) + 1;
    });

    // Paso 2: Calcular Score de Conexión por Documento
    documents.forEach(doc => {
        const h = doc.primaryHolder.trim().toLowerCase();
        const a = doc.address_search_text ? doc.address_search_text.trim().toLowerCase() : '';
        
        let connections = 0;
        // Si el titular aparece en más de 1 documento
        if (holders[h] > 1) connections += (holders[h] - 1);
        
        // Si la dirección aparece en más de 1 documento
        if (addresses[a] > 1) connections += (addresses[a] - 1);
        
        map.set(doc.id, connections);
    });

    return map;
  }, [documents]);

  const stats = useMemo(() => {
    // Contamos cuántos documentos tienen al menos 1 conexión detectada
    let connectedDocsCount = 0;
    connectionAnalysis.forEach(count => {
        if (count > 0) connectedDocsCount++;
    });

    return {
        total: filteredDocuments.length,
        connected: connectedDocsCount,
        volume: filteredDocuments.reduce((acc, curr) => acc + (Number(curr.endingBalance) || 0), 0)
    };
  }, [filteredDocuments, connectionAnalysis]);

  // Función segura de formateo de fecha (Mejorada para tu BD)
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'Sin fecha') return '---';
    try {
        const clean = dateStr.trim().split(' ')[0]; 
        if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) {
             const [year, month, day] = clean.split('-');
             return `${day}/${month}/${year}`;
        }
        return clean;
    } catch (e) {
        return dateStr;
    }
  };

  const getTitle = () => {
      switch (currentView) {
          case 'important': return 'Expedientes Importantes';
          case 'archived': return 'Archivo Histórico';
          default: return 'Dashboard Principal';
      }
  };

  return (
    // Responsive padding: p-4 on mobile (plus top offset for menu), p-8 on desktop
    <div className="w-full min-h-screen text-slate-200 p-4 pt-16 md:p-8 overflow-x-hidden">
      
      {/* Header Responsivo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div className="pl-8 md:pl-0"> {/* Padding left on mobile for header text not to touch menu button */}
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{getTitle()}</h2>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
               <Database size={10} className="text-indigo-400" /> HOSTINGER
            </span>
            <span className={`flex items-center gap-1.5 text-[10px] md:text-xs font-mono px-2 py-1 rounded border ${error ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
               {error ? <WifiOff size={10}/> : <Wifi size={10}/>} 
               {error ? 'OFFLINE' : 'LIVE'}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest hidden md:inline-block">
                Sinc: {lastSync}
            </span>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={loadData} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 flex-1 md:flex-none justify-center flex">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 flex-1 md:flex-none">
            <Download size={16} /> <span className="hidden md:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* KPI Section - Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Expedientes', value: stats.total, color: 'text-white' },
          { label: 'Conexiones Detectadas', value: stats.connected, color: 'text-amber-400' },
          { label: 'Volumen USD', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(stats.volume), color: 'text-emerald-400' }
        ].map((kpi, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md relative overflow-hidden">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1 relative z-10">{kpi.label}</p>
            <p className={`text-2xl md:text-3xl font-mono font-bold relative z-10 ${kpi.color}`}>{loading ? '...' : kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Advanced Search Bar Responsiva */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6">
        <div className="flex-1 relative group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-200 placeholder:text-slate-600"
          />
          {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                title="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
          )}
        </div>
        
        {/* Date Filter (Backend) */}
        <div className="relative w-full md:w-auto">
            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
            <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full md:w-auto bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-300 placeholder:text-slate-600 appearance-none min-w-[160px]"
                placeholder="Fecha inicio"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                title="Limpiar fecha"
              >
                <X size={14} />
              </button>
            )}
        </div>

        <select 
           value={selectedBank}
           onChange={(e) => setSelectedBank(e.target.value)}
           className="w-full md:w-auto bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-300 md:min-w-[200px]"
        >
            <option value="">Todos los Bancos</option>
            {banks.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Main Table Content - Container con estilo completo */}
      {/* max-w-full ensures it doesn't break parent on mobile */}
      <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col min-h-[500px] max-w-full">
        <div className="overflow-x-auto w-full custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-950/90 sticky top-0 z-10">
              <tr className="text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-800">
                <th className="py-4 px-4 md:px-6">Doc</th>
                <th className="py-4 px-4 md:px-6">Banco</th>
                <th className="py-4 px-4 md:px-6">Firmante Principal</th>
                <th className="py-4 px-4 md:px-6 text-center">Red</th>
                <th className="py-4 px-4 md:px-6">Fecha Corte</th>
                <th className="py-4 px-4 md:px-6 text-right">Balance</th>
                <th className="py-4 px-4 md:px-6 text-center">Estado</th>
                <th className="py-4 px-4 md:px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 bg-slate-900/20">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-32 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                    <RefreshCw size={32} className="animate-spin text-indigo-500 mx-auto mb-4 opacity-50" />
                    Cargando Datos...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-24 text-center text-slate-600 italic">No se encontraron resultados.</td>
                </tr>
              ) : filteredDocuments.map((doc) => (
                <tr 
                  key={doc.id} 
                  className="group hover:bg-indigo-500/[0.03] cursor-pointer transition-colors border-b border-slate-800/20"
                >
                  {/* PDF LINK */}
                  <td className="py-4 px-4 md:px-6" onClick={(e) => { e.stopPropagation(); if(doc.link_pdf) setPreviewPdfUrl(doc.link_pdf); }}>
                     {doc.link_pdf ? (
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:scale-110 transition-all cursor-pointer">
                            <Eye size={16} />
                        </div>
                     ) : (
                        <span className="text-slate-700 font-bold uppercase text-[9px]">---</span>
                     )}
                  </td>

                  <td className="py-4 px-4 md:px-6" onClick={() => onSelectDocument(doc)}>
                    <div className="flex items-center gap-2">
                      <Landmark size={14} className="text-slate-500" />
                      <span className="text-sm font-semibold text-slate-200">{doc.bankName}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 md:px-6 text-sm text-slate-300" onClick={() => onSelectDocument(doc)}>
                    <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-600 shrink-0" />
                        <span className="truncate max-w-[200px]">{doc.primaryHolder}</span>
                    </div>
                  </td>

                  {/* Red Column */}
                  <td className="py-4 px-4 md:px-6 text-center" onClick={() => onSelectDocument(doc)}>
                      {(() => {
                          const count = connectionAnalysis.get(doc.id) || 0;
                          if (count > 0) {
                              return (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wide shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                                      <Link size={10} />
                                      <span>{count} Vínculos</span>
                                  </div>
                              );
                          }
                          return <span className="text-slate-700 font-bold uppercase text-[9px]">---</span>;
                      })()}
                  </td>

                  <td className="py-4 px-4 md:px-6 text-xs text-slate-400 font-mono" onClick={() => onSelectDocument(doc)}>
                      <div className="flex items-center gap-2">
                          <CalendarDays size={12} className="text-slate-600" />
                          {/* Se usa statementDate (Fecha Corte) explícitamente */}
                          {formatDate(doc.statementDate)}
                      </div>
                  </td>

                  <td className="py-4 px-4 md:px-6 text-right font-mono font-bold text-emerald-400" onClick={() => onSelectDocument(doc)}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(doc.endingBalance)}
                  </td>

                  <td className="py-4 px-4 md:px-6 text-center" onClick={() => onSelectDocument(doc)}>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          doc.audit_status === 'Auditado' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                          {doc.audit_status}
                      </span>
                  </td>

                  <td className="py-4 px-4 md:px-6 text-right" onClick={() => onSelectDocument(doc)}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 group-hover:text-white group-hover:bg-indigo-600 transition-all">
                          <ArrowUpRight size={16} />
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF LIGHTBOX POPUP (Legacy - for quick preview from table icon) */}
      <AnimatePresence>
        {previewPdfUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-slate-900 w-full md:w-[90%] h-[85vh] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/50 relative z-10">
                 <div className="flex items-center gap-3">
                    <FileText className="text-red-400" size={20} />
                    <span className="text-white text-sm font-bold">Visor de Documento</span>
                 </div>
                 <button 
                    onClick={() => setPreviewPdfUrl(null)}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                 >
                    <X size={20} />
                 </button>
              </div>
              
              {/* PDF Container with Zoom Logic */}
              <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
                 <div className="flex-1 w-full h-full overflow-auto relative bg-slate-950/50 flex items-start justify-center p-4">
                    <iframe 
                        src={getEmbedUrl(previewPdfUrl)} 
                        className="w-full h-full border-none"
                        style={{ 
                            transform: `scale(${pdfZoom})`, 
                            transformOrigin: 'top center',
                            transition: 'transform 0.2s ease-out'
                        }}
                        title="PDF Viewer"
                        allow="autoplay"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                    />
                 </div>

                 {/* Zoom Controls Toolbar */}
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2 rounded-xl shadow-2xl z-20">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setPdfZoom(z => Math.max(0.6, z - 0.2)); }}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                        title="Alejar"
                    >
                        <Minus size={18} />
                    </button>
                    
                    <span className="text-xs font-mono font-bold text-indigo-400 min-w-[3rem] text-center select-none">
                        {Math.round(pdfZoom * 100)}%
                    </span>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); setPdfZoom(z => Math.min(3, z + 0.2)); }}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                        title="Acercar"
                    >
                        <Plus size={18} />
                    </button>

                    <div className="w-px h-4 bg-slate-700 mx-1"></div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setPdfZoom(1); }}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                        title="Restablecer (100%)"
                    >
                        <RotateCcw size={16} />
                    </button>
                 </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileText, 
  Search, 
  ShieldCheck, 
  Save, 
  FileSearch, 
  User, 
  CheckCircle2, 
  Loader2, 
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle,
  XCircle,
  Check,
  MapPin,
  Eraser,
  Cake,
  Copy,
  ExternalLink,
  Users,
  CreditCard,
  Hash,
  Briefcase,
  Phone,
  Mail,
  StickyNote,
  ClipboardCopy,
  Minus,
  Plus,
  RotateCcw,
  Star,
  Archive,
  CheckSquare,
  Hand,
  MousePointer2
} from 'lucide-react';
import { FinancialDocument, Citizen } from '../types';
import { api } from '../services/api';

interface WorkspaceProps {
  document: FinancialDocument;
  onClose: () => void;
}

// Internal Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.9 }}
    className={`fixed bottom-8 right-8 z-[80] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border ${
      type === 'success' 
        ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-100' 
        : 'bg-red-900/80 border-red-500/30 text-red-100'
    }`}
  >
    {type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />}
    <span className="font-medium">{message}</span>
  </motion.div>
);

// Micro-component for Click-to-Copy
const CopyValue = ({ text, className = "", iconSize = 12 }: { text: string, className?: string, iconSize?: number }) => {
  const [copied, setCopied] = useState(false);
  
  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
        onClick={onCopy} 
        className={`group/copy cursor-pointer flex items-center gap-2 transition-all rounded px-2 py-1 hover:bg-white/10 relative ${className}`}
        title="Copiar al portapapeles"
    >
        <span>{text}</span>
        {copied ? (
            <Check size={iconSize} className="text-emerald-400 shrink-0 animate-in zoom-in duration-200" />
        ) : (
            <Copy size={iconSize} className="text-slate-500 opacity-50 group-hover/copy:opacity-100 transition-opacity shrink-0" />
        )}
        {copied && (
             <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-emerald-500 text-emerald-950 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wide animate-in fade-in zoom-in z-50 whitespace-nowrap shadow-lg">
                 Copiado
             </span>
        )}
    </div>
  );
};

const tabs = [
  { id: 'extract', label: 'Datos', icon: FileText },
  { id: 'radar', label: 'Radar', icon: Search },
  { id: 'validation', label: 'Validaciones', icon: ShieldCheck },
  { id: 'summary', label: 'Ficha Final', icon: Save },
];

// Definition of a Signer Slot
interface SignerSlot {
    id: number; // 0, 1, 2
    label: string;
    rawName: string; // Nombre extraído del PDF (puede estar incompleto)
    citizen: Citizen | null; // Datos validados del CNE
    manualData: {
        ultimo_empleo: string;
        fecha_empleo: string;
        telefono: string;
        correo: string;
        nota: string;
    };
    validations: {
        ivss: 'idle' | 'loading' | 'success' | 'error';
        banavih: 'idle' | 'loading' | 'success' | 'error';
    };
}

const Workspace: React.FC<WorkspaceProps> = ({ document, onClose }) => {
  const [activeTab, setActiveTab] = useState('extract');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  // --- ZOOM & PAN STATE ---
  const [pdfZoom, setPdfZoom] = useState(1.0);
  const [isPanMode, setIsPanMode] = useState(false);
  
  // Refs & State for Drag Scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

  // --- GLOBAL FORM DATA STATE ---
  const [formData, setFormData] = useState({
    bankName: document.bankName,
    statementDate: document.statementDate,
    endingBalance: document.endingBalance.toString(),
    accountNumber: '',
    routingNumber: '',
    bankAddress: document.address_search_text || '',
  });

  const [globalNote, setGlobalNote] = useState(''); 
  const [isImportant, setIsImportant] = useState(document.es_importante || false);
  const [isCompleted, setIsCompleted] = useState(document.es_completado || false);

  // --- MULTI-SIGNER STATE ---
  const [activeSignerIdx, setActiveSignerIdx] = useState(0); 
  
  const [signers, setSigners] = useState<SignerSlot[]>([
      {
          id: 0,
          label: 'Firmante 1',
          rawName: document.primaryHolder || '',
          citizen: null,
          manualData: { ultimo_empleo: '', fecha_empleo: '', telefono: '', correo: '', nota: '' },
          validations: { ivss: 'idle', banavih: 'idle' }
      },
      {
          id: 1,
          label: 'Firmante 2',
          rawName: document.secondaryHolder || '',
          citizen: null,
          manualData: { ultimo_empleo: '', fecha_empleo: '', telefono: '', correo: '', nota: '' },
          validations: { ivss: 'idle', banavih: 'idle' }
      },
      {
          id: 2,
          label: 'Firmante 3',
          rawName: '',
          citizen: null,
          manualData: { ultimo_empleo: '', fecha_empleo: '', telefono: '', correo: '', nota: '' },
          validations: { ivss: 'idle', banavih: 'idle' }
      }
  ]);

  // --- SEARCH STATE ---
  const [searchParams, setSearchParams] = useState({
    cedula: '',
    p_nombre: '',
    s_nombre: '',
    p_apellido: '',
    s_apellido: ''
  });
  const [searchResults, setSearchResults] = useState<Citizen[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initWorkspace = async () => {
      setIsLoadingInitial(true);
      try {
        const nameParts = document.primaryHolder.trim().split(/\s+/);
        if (nameParts.length > 0) {
            setSearchParams(prev => ({
                ...prev,
                p_nombre: nameParts[0] || '',
                p_apellido: nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''
            }));
        }

        const existingFicha = await api.getFicha(document.id);
        if (existingFicha && existingFicha.expediente) {
            showToast('Expediente cargado correctamente', 'success');
        }
      } catch (e) {
        console.error("No existing record or error", e);
      } finally {
        setIsLoadingInitial(false);
      }
    };
    initWorkspace();
  }, [document.id, document.primaryHolder]);

  // --- HELPERS ---
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateSigner = (index: number, changes: Partial<SignerSlot>) => {
      setSigners(prev => {
          const newSigners = [...prev];
          newSigners[index] = { ...newSigners[index], ...changes };
          return newSigners;
      });
  };

  const updateSignerManualData = (index: number, field: keyof SignerSlot['manualData'], value: string) => {
      setSigners(prev => {
          const newSigners = [...prev];
          newSigners[index] = {
              ...newSigners[index],
              manualData: {
                  ...newSigners[index].manualData,
                  [field]: value
              }
          };
          return newSigners;
      });
  };

  const getEmbedUrl = (url: string | undefined) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (!match) match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    // Attempt to hide native toolbar for cleaner UI (works on some browsers/PDFs)
    return `${url}#toolbar=0&navpanes=0&scrollbar=0`;
  };

  // --- DRAG SCROLL HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPanMode || !scrollContainerRef.current) return;
    setIsDragging(true);
    setStartPos({ x: e.pageX, y: e.pageY });
    setScrollPos({ 
        x: scrollContainerRef.current.scrollLeft, 
        y: scrollContainerRef.current.scrollTop 
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    // Multiplier 1.5 for faster feel
    const walkX = (e.pageX - startPos.x) * 1.5; 
    const walkY = (e.pageY - startPos.y) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollPos.x - walkX;
    scrollContainerRef.current.scrollTop = scrollPos.y - walkY;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- LOGIC HANDLERS ---
  const handleSearchIdentity = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const hasValues = Object.values(searchParams).some(val => val.trim().length > 0);
    if (!hasValues) {
        showToast('Ingrese al menos un criterio de búsqueda', 'error');
        return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    const cleanParams = {
        cedula: searchParams.cedula.replace(/^\*+/, ''),
        p_nombre: searchParams.p_nombre.replace(/^\*+/, ''),
        s_nombre: searchParams.s_nombre.replace(/^\*+/, ''),
        p_apellido: searchParams.p_apellido.replace(/^\*+/, ''),
        s_apellido: searchParams.s_apellido.replace(/^\*+/, '')
    };

    try {
      const results = await api.searchIdentity(cleanParams);
      setSearchResults(results);
      if (results.length === 0) showToast('No se encontraron coincidencias', 'error');
    } catch (e) {
      showToast('Error de conexión con BD Nacional', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleValidation = async (target: 'ivss' | 'banavih') => {
    const currentSigner = signers[activeSignerIdx];
    if (!currentSigner.citizen) {
      showToast('Asigne una identidad a este firmante primero', 'error');
      return;
    }
    const newValidations = { ...currentSigner.validations, [target]: 'loading' as const };
    updateSigner(activeSignerIdx, { validations: newValidations });

    try {
      await api.validateExternal(target, currentSigner.citizen.cedula);
      setSigners(prev => {
          const arr = [...prev];
          arr[activeSignerIdx] = {
              ...arr[activeSignerIdx],
              validations: { ...arr[activeSignerIdx].validations, [target]: 'success' }
          };
          return arr;
      });

    } catch (e) {
      setSigners(prev => {
          const arr = [...prev];
          arr[activeSignerIdx] = {
              ...arr[activeSignerIdx],
              validations: { ...arr[activeSignerIdx].validations, [target]: 'error' }
          };
          return arr;
      });
      showToast(`Fallo en consulta ${target.toUpperCase()}`, 'error');
    }
  };

  const handleSaveFicha = async () => {
    const activeSigners = signers.filter(s => s.citizen !== null);
    if (activeSigners.length === 0 && !isCompleted && !isImportant) {
        showToast('Debe validar al menos un firmante o cambiar el estado', 'error');
        return;
    }

    setIsSaving(true);
    const primarySigner = activeSigners.length > 0 ? activeSigners[0] : null;

    const notasCombinadas = [
        ...(globalNote.trim() ? [{
            firmante: 'GLOBAL',
            identidad: 'N/A',
            nota: globalNote
        }] : []),
        ...activeSigners.map(s => ({
            firmante: s.label,
            identidad: s.citizen!.nombre_completo,
            nota: s.manualData.nota
        }))
    ];

    const fichaPayload = {
      document_id: document.id,
      cliente_validado_cedula: primarySigner ? primarySigner.citizen!.cedula : null,
      riesgo_global: document.audit_riesgo || 'Bajo', 
      es_importante: isImportant,
      es_completado: isCompleted,
      expediente_completo: {
          pdf_data: { ...document, ...formData }, 
          firmantes: activeSigners,
          meta: {
              fecha_auditoria: new Date().toISOString(),
              version: "3.1-multifirmante-status"
          }
      },
      notas_usuario_historial: notasCombinadas
    };

    try {
      const result = await api.saveFicha(fichaPayload);
      if (result && result.status === 'success') {
        showToast('Expediente actualizado correctamente', 'success');
        setTimeout(() => onClose(), 1000);
      } else {
        showToast('Error al guardar', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        // Z-Index 70 to stay above Sidebar button (60)
        className="fixed inset-0 z-[70] bg-slate-950 flex flex-col md:flex-row shadow-2xl overflow-hidden"
      >
        {/* ---------------- LEFT PANEL: VISUALIZER ---------------- */}
        {/* Mobile: h-[40vh] for better PDF visibility. Desktop: h-full, w-1/2 */}
        <div className="w-full h-[40vh] md:h-full md:w-1/2 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 relative flex flex-col shrink-0">
          <div className="h-10 md:h-14 border-b border-slate-800 flex items-center px-4 md:px-6 bg-slate-900/50 backdrop-blur-md shrink-0 justify-between md:justify-start">
             <span className="text-slate-400 text-[10px] md:text-xs font-mono uppercase tracking-widest flex items-center gap-2">
               <FileSearch size={14} /> Vista Preliminar
             </span>
             {/* Mobile Close Button (Duplicate for easier access) */}
             <button onClick={onClose} className="md:hidden text-slate-400 p-1">
                 <X size={18} />
             </button>
          </div>
          
          {/* PDF Viewer with Zoom & Pan */}
          <div 
            ref={scrollContainerRef}
            className={`flex-1 relative bg-slate-950/50 flex items-start justify-center overflow-auto custom-scrollbar select-none ${isPanMode ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div 
              className="relative transition-all duration-200 ease-out flex-shrink-0"
              style={{ 
                width: `${pdfZoom * 100}%`,
                // Scale height as well to allow vertical panning
                height: pdfZoom > 1 ? `${pdfZoom * 100}%` : '100%',
                minHeight: '100%',
                // Reduced padding on mobile (p-4) vs desktop (p-8 / 2rem)
                padding: window.innerWidth < 768 ? '1rem' : '2rem'
              }}
            >
               <div className="w-full h-full min-h-[400px] md:min-h-[800px] relative bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700">
                  {document.link_pdf ? (
                    <>
                        <iframe 
                        src={getEmbedUrl(document.link_pdf)} 
                        className="w-full h-full border-none"
                        title="PDF Viewer"
                        allow="autoplay"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                        />
                        {/* Transparent Overlay for Panning Mode */}
                        {isPanMode && (
                            <div className="absolute inset-0 z-10 bg-transparent" />
                        )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 pt-10 md:pt-20">
                        <FileText size={32} className="text-slate-600 mb-4" />
                        <p className="text-slate-500 text-sm">Previsualización no disponible</p>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Floating Zoom Controls */}
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-1.5 rounded-xl shadow-2xl z-20 scale-90 md:scale-100">
              {/* Pan Tool Toggle */}
              <button 
                  onClick={() => setIsPanMode(!isPanMode)}
                  className={`p-2 rounded-lg transition-colors ${isPanMode ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                  title={isPanMode ? "Modo Interacción (Seleccionar)" : "Modo Paneo (Mover)"}
              >
                  {isPanMode ? <Hand size={18} /> : <MousePointer2 size={18} />}
              </button>

              <div className="w-px h-4 bg-slate-700 mx-1"></div>

              <button 
                  onClick={() => setPdfZoom(z => Math.max(0.5, z - 0.25))}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                  title="Alejar"
              >
                  <Minus size={18} />
              </button>
              
              <span className="text-xs font-mono font-bold text-indigo-400 min-w-[3rem] text-center select-none">
                  {Math.round(pdfZoom * 100)}%
              </span>
              
              <button 
                  onClick={() => setPdfZoom(z => Math.min(3, z + 0.25))}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                  title="Acercar"
              >
                  <Plus size={18} />
              </button>

              <div className="w-px h-4 bg-slate-700 mx-1"></div>

              <button 
                  onClick={() => setPdfZoom(1)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                  title="Restablecer (100%)"
              >
                  <RotateCcw size={16} />
              </button>
          </div>
        </div>

        {/* ---------------- RIGHT PANEL: COMMAND CENTER ---------------- */}
        <div className="flex-1 w-full md:w-1/2 flex flex-col bg-slate-950 relative overflow-hidden">
          
          {/* Header */}
          <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 bg-slate-950">
              <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Building2 size={16} />
                 </div>
                 <div className="truncate">
                    <h2 className="text-white font-medium tracking-tight text-sm truncate">{document.bankName}</h2>
                    <p className="text-[10px] text-slate-500 font-mono uppercase truncate">{document.fileName}</p>
                 </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors hidden md:block">
                 <X size={20} />
              </button>
          </div>

          {/* Loading Overlay */}
          {isLoadingInitial && (
              <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
              </div>
          )}

          {/* Main Tabs */}
          <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2 border-b border-slate-800/50">
             <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl overflow-x-auto custom-scrollbar">
               {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 py-2 px-3 text-xs md:text-sm font-medium rounded-lg transition-colors z-10 flex items-center justify-center gap-2 whitespace-nowrap ${
                      activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20 -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <tab.icon size={14} className="md:w-4 md:h-4" />
                    {tab.label}
                  </button>
               ))}
             </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">
            <AnimatePresence mode="wait">
               
               {/* --- TAB 1: EXTRACT (Data Extraction) --- */}
               {activeTab === 'extract' && (
                  <motion.div 
                     key="extract"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="space-y-6 max-w-lg mx-auto pb-20 md:pb-0" // Extra padding for mobile scroll
                  >
                     <div className="space-y-4">
                        {/* Signer Raw Names Input */}
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                             <h4 className="text-xs text-slate-500 uppercase font-bold flex items-center gap-2">
                                <Users size={12} /> Nombres Detectados en Doc
                             </h4>
                             {signers.map((s, idx) => {
                                 // OCULTAMIENTO: Solo mostramos firmantes secundarios si tienen datos extraídos
                                 if (idx > 0 && !s.rawName) return null;

                                 return (
                                     <div key={s.id}>
                                         <label className="text-[10px] text-slate-400 ml-1 mb-1 block">{s.label}</label>
                                         <input 
                                            value={s.rawName}
                                            onChange={(e) => updateSigner(idx, { rawName: e.target.value })}
                                            placeholder={`Nombre del ${s.label} según PDF`}
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                         />
                                     </div>
                                 );
                             })}
                        </div>

                        <div className="h-px bg-slate-800 w-full" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-slate-500 uppercase font-semibold mb-1.5 flex items-center gap-2">
                                  <Building2 size={12} /> Entidad Bancaria
                              </label>
                              <input 
                                value={formData.bankName}
                                onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 uppercase font-semibold mb-1.5 flex items-center gap-2">
                                  <Calendar size={12} /> Fecha Corte
                              </label>
                              <input 
                                value={formData.statementDate}
                                onChange={(e) => setFormData({...formData, statementDate: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                        </div>

                        <div>
                           <label className="text-xs text-slate-500 uppercase font-semibold mb-1.5 flex items-center gap-2">
                              <DollarSign size={12} /> Saldo Final
                           </label>
                           <input 
                             value={formData.endingBalance} 
                             onChange={(e) => setFormData({...formData, endingBalance: e.target.value})}
                             className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-lg font-bold p-3 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none"
                           />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-semibold mb-1.5 flex items-center gap-2">
                                    <CreditCard size={12} /> Nro. Cuenta
                                </label>
                                <input 
                                    value={formData.accountNumber}
                                    onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                                    placeholder="0000 0000 0000 0000"
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-semibold mb-1.5 flex items-center gap-2">
                                    <Hash size={12} /> Ruta / ABA
                                </label>
                                <input 
                                    value={formData.routingNumber}
                                    onChange={(e) => setFormData({...formData, routingNumber: e.target.value})}
                                    placeholder="000000000"
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div>
                           <label className="text-xs text-slate-500 uppercase font-semibold mb-1.5 flex items-center gap-2">
                              <MapPin size={12} /> Dirección Sucursal
                           </label>
                           <textarea 
                             value={formData.bankAddress} 
                             onChange={(e) => setFormData({...formData, bankAddress: e.target.value})}
                             className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none text-sm"
                             placeholder="Dirección detectada en el documento..."
                           />
                        </div>
                     </div>
                  </motion.div>
               )}

               {/* ... Other tabs content remains same ... */}
               {/* Including other tabs in the output would make the response too long, 
                   assuming they inherit the flex layout correctly from parent container */}
               {activeTab === 'radar' && (
                  <motion.div 
                     key="radar"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="flex flex-col h-full"
                  >
                     {/* Signer Selector Tabs */}
                     <div className="flex gap-2 mb-4 p-1 bg-slate-900 rounded-lg border border-slate-800">
                         {signers.map((s, idx) => (
                             <button
                                key={s.id}
                                onClick={() => setActiveSignerIdx(idx)}
                                className={`flex-1 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                                    activeSignerIdx === idx 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                             >
                                 <User size={12} /> 
                                 {s.label}
                                 {s.citizen && <CheckCircle2 size={10} className="text-emerald-400 ml-1" />}
                             </button>
                         ))}
                     </div>

                     {/* Estado de Asignación Actual */}
                     <div className="mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                         <div>
                             <span className="text-xs text-slate-500 block">Editando: <strong className="text-indigo-400">{signers[activeSignerIdx].label}</strong></span>
                             {signers[activeSignerIdx].citizen ? (
                                  <div className="flex items-center gap-2 mt-1">
                                      <CheckCircle2 size={12} className="text-emerald-400" />
                                      <span className="text-sm text-slate-200 font-medium">{signers[activeSignerIdx].citizen.nombre_completo}</span>
                                  </div>
                             ) : (
                                  <span className="text-xs text-slate-600 italic mt-1 block">Sin identidad asignada</span>
                             )}
                         </div>
                         {signers[activeSignerIdx].citizen && (
                             <button 
                                onClick={() => updateSigner(activeSignerIdx, { citizen: null })}
                                className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                title="Desvincular Identidad"
                             >
                                 <X size={16} />
                             </button>
                         )}
                     </div>

                     <form onSubmit={handleSearchIdentity} className="space-y-4 mb-6">
                        {/* Search inputs */}
                        <div className="flex flex-col md:flex-row gap-4">
                           <div className="flex-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 ml-1 block">Cédula</label>
                                <input 
                                    value={searchParams.cedula}
                                    onChange={(e) => setSearchParams({...searchParams, cedula: e.target.value})}
                                    placeholder="Ej: 12345678"
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                />
                           </div>
                           <div className="flex items-end gap-2">
                                <button 
                                type="button"
                                onClick={() => setSearchParams({cedula: '', p_nombre: '', s_nombre: '', p_apellido: '', s_apellido: ''})}
                                className="h-[50px] w-[50px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-colors border border-slate-700"
                                >
                                    <Eraser size={20} />
                                </button>
                                <button 
                                type="submit"
                                disabled={isSearching}
                                className="flex-1 md:flex-none h-[50px] bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                {isSearching ? <Loader2 size={20} className="animate-spin" /> : <><Search size={18} /> Buscar</>}
                                </button>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                value={searchParams.p_nombre}
                                onChange={(e) => setSearchParams({...searchParams, p_nombre: e.target.value})}
                                placeholder="Primer Nombre"
                                className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <input 
                                value={searchParams.s_nombre}
                                onChange={(e) => setSearchParams({...searchParams, s_nombre: e.target.value})}
                                placeholder="Segundo Nombre"
                                className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                             <input 
                                value={searchParams.p_apellido}
                                onChange={(e) => setSearchParams({...searchParams, p_apellido: e.target.value})}
                                placeholder="Primer Apellido"
                                className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <input 
                                value={searchParams.s_apellido}
                                onChange={(e) => setSearchParams({...searchParams, s_apellido: e.target.value})}
                                placeholder="Segundo Apellido"
                                className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </form>
                     
                     {/* Results List */}
                     <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar border-t border-slate-800 pt-4">
                        {searchResults.map((person, idx) => (
                           <motion.div 
                             key={idx}
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             onClick={() => updateSigner(activeSignerIdx, { citizen: person })}
                             className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                                signers[activeSignerIdx].citizen?.cedula === person.cedula 
                                  ? 'bg-emerald-900/10 border-emerald-500/50 ring-1 ring-emerald-500/50' 
                                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                             }`}
                           >
                              <div className="flex justify-between items-center">
                                 <div>
                                    <h4 className="text-slate-200 font-medium">{person.nombre_completo}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-slate-400 text-sm font-mono">{person.cedula}</p>
                                        {person.fecha_nacimiento && (
                                            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                                                <Cake size={12} /> {person.fecha_nacimiento}
                                            </span>
                                        )}
                                    </div>
                                 </div>
                                 {signers[activeSignerIdx].citizen?.cedula === person.cedula ? (
                                     <div className="flex items-center gap-2 bg-emerald-500 text-emerald-950 px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-emerald-500/20">
                                         <Check size={14} /> Asignado
                                     </div>
                                 ) : (
                                     <div className="opacity-0 group-hover:opacity-100 text-xs text-indigo-400 font-medium transition-opacity">
                                         Clic para asignar
                                     </div>
                                 )}
                              </div>
                           </motion.div>
                        ))}
                     </div>
                  </motion.div>
               )}
               {activeTab === 'validation' && (
                  <motion.div 
                     key="validation"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="flex flex-col h-full"
                  >
                     {/* Signer Selector Tabs */}
                     <div className="flex gap-2 mb-6 p-1 bg-slate-900 rounded-lg border border-slate-800">
                         {signers.map((s, idx) => (
                             <button
                                key={s.id}
                                onClick={() => setActiveSignerIdx(idx)}
                                className={`flex-1 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                                    activeSignerIdx === idx 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                             >
                                 <User size={12} /> {s.label}
                                 {s.citizen && <CheckCircle2 size={10} className="text-emerald-400 ml-1" />}
                             </button>
                         ))}
                     </div>

                     {!signers[activeSignerIdx].citizen ? (
                         <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                             <AlertTriangle size={32} className="text-amber-500 mb-3 opacity-80" />
                             <h3 className="text-slate-300 font-medium">Firmante No Identificado</h3>
                             <p className="text-sm text-slate-500 mt-2 max-w-xs">
                                 Vaya a la pestaña <strong>Radar</strong> y busque a la persona para poder habilitar las validaciones de IVSS y Banavih.
                             </p>
                         </div>
                     ) : (
                         <div className="space-y-6">
                             {/* COPY DASHBOARD */}
                             <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-inner">
                                 <h4 className="text-xs text-slate-500 uppercase font-bold mb-4 flex items-center gap-2">
                                     <ClipboardCopy size={12} /> Portapapeles Forense
                                 </h4>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex justify-between items-center group hover:border-indigo-500/30 transition-colors">
                                         <div>
                                             <span className="text-[10px] text-slate-500 block uppercase">Cédula</span>
                                             <span className="text-lg font-mono text-slate-200 font-bold">{signers[activeSignerIdx].citizen?.cedula}</span>
                                         </div>
                                         <CopyValue text={signers[activeSignerIdx].citizen?.cedula || ''} iconSize={18} className="p-2 bg-slate-800 rounded hover:bg-indigo-600 hover:text-white" />
                                     </div>
                                     <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex justify-between items-center group hover:border-indigo-500/30 transition-colors">
                                         <div>
                                             <span className="text-[10px] text-slate-500 block uppercase">Fecha Nacimiento</span>
                                             <span className="text-lg font-mono text-slate-200 font-bold">{signers[activeSignerIdx].citizen?.fecha_nacimiento || '---'}</span>
                                         </div>
                                         <CopyValue text={signers[activeSignerIdx].citizen?.fecha_nacimiento || ''} iconSize={18} className="p-2 bg-slate-800 rounded hover:bg-indigo-600 hover:text-white" />
                                     </div>
                                     <div className="col-span-1 md:col-span-2 bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex justify-between items-center group hover:border-indigo-500/30 transition-colors">
                                         <div className="truncate pr-4">
                                             <span className="text-[10px] text-slate-500 block uppercase">Nombre Completo</span>
                                             <span className="text-sm font-medium text-slate-200 truncate">{signers[activeSignerIdx].citizen?.nombre_completo}</span>
                                         </div>
                                         <CopyValue text={signers[activeSignerIdx].citizen?.nombre_completo || ''} iconSize={18} className="p-2 bg-slate-800 rounded hover:bg-indigo-600 hover:text-white shrink-0" />
                                     </div>
                                 </div>
                             </div>

                             {/* EXTERNAL ACTIONS */}
                             <div className="grid grid-cols-1 gap-4">
                                {/* IVSS */}
                                <div className={`border p-4 rounded-xl flex items-center justify-between transition-all ${
                                    signers[activeSignerIdx].validations.ivss === 'success' ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-slate-200 font-medium text-sm">Portal IVSS</h4>
                                            <a href="http://www.ivss.gov.ve/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-xs flex items-center gap-1 hover:underline mt-0.5">
                                                Abrir Cuenta Individual <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleValidation('ivss')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                            signers[activeSignerIdx].validations.ivss === 'success' 
                                            ? 'bg-emerald-500 text-emerald-950' 
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {signers[activeSignerIdx].validations.ivss === 'success' ? 'Validado' : 'Marcar OK'}
                                    </button>
                                </div>

                                {/* BANAVIH */}
                                <div className={`border p-4 rounded-xl flex items-center justify-between transition-all ${
                                    signers[activeSignerIdx].validations.banavih === 'success' ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-amber-600/20 text-amber-400 rounded-lg flex items-center justify-center">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-slate-200 font-medium text-sm">Portal Banavih</h4>
                                            <a href="http://elegibilidad.banavih.gob.ve/sirevih_web.php/sys_usuario_web/editBuscarCedula" target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-xs flex items-center gap-1 hover:underline mt-0.5">
                                                Abrir Elegibilidad <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleValidation('banavih')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                            signers[activeSignerIdx].validations.banavih === 'success' 
                                            ? 'bg-emerald-500 text-emerald-950' 
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {signers[activeSignerIdx].validations.banavih === 'success' ? 'Validado' : 'Marcar OK'}
                                    </button>
                                </div>
                             </div>
                         </div>
                     )}
                  </motion.div>
               )}
               {activeTab === 'summary' && (
                  <motion.div 
                     key="summary"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="flex flex-col space-y-6 pb-20" // Padding bottom for safe scrolling within container
                  >
                     {/* 1. Global Financial Data */}
                     <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 shadow-lg relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl" />
                        <h4 className="text-xs text-slate-500 uppercase font-bold mb-4 flex items-center gap-2">
                             <Building2 size={12} className="text-indigo-400" /> Datos Financieros Globales
                        </h4>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                            <div>
                                <span className="text-slate-500 text-xs block uppercase tracking-wide">Banco</span>
                                <CopyValue text={formData.bankName} className="text-white font-medium text-base" />
                            </div>
                            <div>
                                <span className="text-slate-500 text-xs block uppercase tracking-wide">Balance</span>
                                <CopyValue text={formData.endingBalance} className="text-emerald-400 font-mono font-bold text-base" />
                            </div>
                            <div>
                                <span className="text-slate-500 text-xs block uppercase tracking-wide">Nro. Cuenta</span>
                                <CopyValue text={formData.accountNumber || '---'} className="text-slate-300 font-mono" />
                            </div>
                             <div>
                                <span className="text-slate-500 text-xs block uppercase tracking-wide">Ruta / ABA</span>
                                <CopyValue text={formData.routingNumber || '---'} className="text-slate-300 font-mono" />
                            </div>
                            <div className="col-span-2 pt-2 border-t border-slate-800/50">
                                <span className="text-slate-500 text-xs block uppercase tracking-wide">Dirección</span>
                                <CopyValue text={formData.bankAddress || '---'} className="text-slate-300" />
                            </div>
                        </div>
                     </div>

                     {/* 2. Global Analyst Notes */}
                     <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                        <h4 className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                                <StickyNote size={12} className="text-amber-400" /> Notas Globales del Caso
                        </h4>
                        <textarea 
                            value={globalNote}
                            onChange={(e) => setGlobalNote(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-20 placeholder:text-slate-600 transition-colors"
                            placeholder="Observaciones generales sobre el expediente..."
                        />
                     </div>

                     {/* 3. Signer Cards Loop (Explicit Mapping) */}
                     {signers.filter(s => s.citizen !== null).length === 0 ? (
                         <div className="text-center py-8 text-slate-500 italic border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                             No se han identificado firmantes para este expediente.
                         </div>
                     ) : (
                         signers.filter(s => s.citizen !== null).map((s, idx) => {
                             // Find original index to update correct state
                             const originalIdx = signers.findIndex(signer => signer.id === s.id);
                             
                             return (
                                <div key={s.id} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-md">
                                    {/* Card Header: Identity Visuals */}
                                    <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <User size={16} className="text-indigo-400" />
                                                <span className="text-base font-bold text-white">{s.citizen!.nombre_completo}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs">
                                                <span className="flex items-center gap-1.5 text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700">
                                                    <CreditCard size={12} className="text-slate-500" />
                                                    <span className="font-mono tracking-wide">{s.citizen!.cedula}</span>
                                                </span>
                                                {s.citizen!.fecha_nacimiento && (
                                                    <span className="flex items-center gap-1.5 text-slate-400">
                                                        <Cake size={12} className="text-emerald-500" />
                                                        <span>{s.citizen!.fecha_nacimiento}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Status Pills */}
                                        <div className="flex flex-col gap-1 items-end">
                                            {s.validations.ivss === 'success' && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase">IVSS OK</span>}
                                            {s.validations.banavih === 'success' && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase">Banavih OK</span>}
                                        </div>
                                    </div>
                                    
                                    {/* Card Body: Manual Data Inputs */}
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="relative">
                                                <Briefcase size={12} className="absolute left-3 top-3.5 text-slate-500" />
                                                <input 
                                                    placeholder="Último Empleo (IVSS)"
                                                    value={s.manualData.ultimo_empleo}
                                                    onChange={(e) => updateSignerManualData(originalIdx, 'ultimo_empleo', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Calendar size={12} className="absolute left-3 top-3.5 text-slate-500" />
                                                <input 
                                                    placeholder="Fecha Egreso (IVSS)"
                                                    value={s.manualData.fecha_empleo}
                                                    onChange={(e) => updateSignerManualData(originalIdx, 'fecha_empleo', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Phone size={12} className="absolute left-3 top-3.5 text-slate-500" />
                                                <input 
                                                    placeholder="Teléfono (Banavih)"
                                                    value={s.manualData.telefono}
                                                    onChange={(e) => updateSignerManualData(originalIdx, 'telefono', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Mail size={12} className="absolute left-3 top-3.5 text-slate-500" />
                                                <input 
                                                    placeholder="Correo Electrónico (Banavih)"
                                                    value={s.manualData.correo}
                                                    onChange={(e) => updateSignerManualData(originalIdx, 'correo', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2 relative">
                                                <StickyNote size={12} className="absolute left-3 top-3.5 text-slate-500" />
                                                <textarea 
                                                    placeholder="Nota Específica para este firmante..."
                                                    value={s.manualData.nota}
                                                    onChange={(e) => updateSignerManualData(originalIdx, 'nota', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-14 placeholder:text-slate-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             );
                         })
                     )}

                     {/* 4. Status Checkboxes */}
                     <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                        <h4 className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                             <CheckSquare size={12} className="text-emerald-400" /> Estatus del Caso
                        </h4>
                        <div className="flex gap-4">
                           <button 
                             onClick={() => setIsImportant(!isImportant)}
                             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                                 isImportant 
                                 ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' 
                                 : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-400/80'
                             }`}
                           >
                              <Star size={16} fill={isImportant ? "currentColor" : "none"} />
                              {isImportant ? 'Marcado Importante' : 'Marcar Importante'}
                           </button>

                           <button 
                             onClick={() => setIsCompleted(!isCompleted)}
                             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                                 isCompleted 
                                 ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold' 
                                 : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400/80'
                             }`}
                           >
                              <Archive size={16} />
                              {isCompleted ? 'Archivar Caso' : 'Archivar como Completado'}
                           </button>
                        </div>
                     </div>

                     <div className="pt-2 pb-8">
                        <button 
                          onClick={handleSaveFicha}
                          disabled={isSaving}
                          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white py-4 rounded-xl font-bold shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                        >
                           {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                           {isSaving ? 'Guardando Expediente...' : 'Guardar y Cerrar Caso'}
                        </button>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- GLOBAL TOAST --- */}
        <AnimatePresence>
           {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default Workspace;
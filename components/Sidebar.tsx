import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ExternalLink,
  Building2,
  Star,
  Archive,
  Shield
} from 'lucide-react';
import { ViewState } from '../types';

// Definimos las props para recibir el estado desde App
interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const sidebarVariants = {
  desktopCollapsed: { width: "4.5rem" },
  desktopExpanded: { width: "16rem" },
  mobileClosed: { x: "-100%" },
  mobileOpen: { x: "0%", width: "16rem" }
};

const textVariants = {
  hidden: { opacity: 0, x: -10, display: "none" },
  visible: { opacity: 1, x: 0, display: "block", transition: { delay: 0.1 } }
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar cambio de tamaño de pantalla para resetear estados
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mapeo de ítems con sus IDs de vista correspondientes
  const menuItems: { id: ViewState; icon: any; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'important', icon: Star, label: 'Importantes' },
    { id: 'manual_search', icon: Shield, label: 'Búsqueda Privada' },
    { id: 'archived', icon: Archive, label: 'Archivo Completado' },
  ];

  // Determinar variante de animación según dispositivo
  const currentVariant = isMobile 
    ? (isMobileOpen ? "mobileOpen" : "mobileClosed")
    : (isHovered ? "desktopExpanded" : "desktopCollapsed");

  const showText = isMobile ? true : isHovered;

  const handleNavigation = (viewId: ViewState) => {
    onNavigate(viewId);
    if (isMobile) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Trigger Button (Floating) */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-slate-800 text-white rounded-lg shadow-lg border border-slate-700"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={currentVariant}
        variants={sidebarVariants}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        className={`fixed left-0 top-0 h-screen bg-slate-950 border-r border-slate-800/50 shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-md transition-all duration-300`}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-center relative border-b border-slate-800/50 shrink-0 mt-12 md:mt-0">
          {/* Internal Close Button for Mobile Drawer */}
          {isMobile && (
              <button 
                  onClick={() => setIsMobileOpen(false)} 
                  className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                  <X size={20} />
              </button>
          )}

          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg shrink-0 z-10">
            FD
          </div>
          <motion.div 
            animate={showText ? "visible" : "hidden"} 
            variants={textVariants} 
            className="absolute left-20 whitespace-nowrap"
          >
            <h1 className="font-bold text-white tracking-wide">FinData<span className="text-indigo-400">Verify</span></h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Intelligence SaaS</p>
          </motion.div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`group flex items-center p-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <item.icon size={22} className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'}`} />
                
                <motion.span 
                  animate={showText ? "visible" : "hidden"} 
                  variants={textVariants} 
                  className="ml-4 font-medium text-sm whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
                
                {isActive && showText && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_currentColor]" 
                  />
                )}
              </button>
            );
          })}

          {/* Separator */}
          <div className="my-2 h-px bg-slate-800/50 mx-2" />

          {/* External Links Title */}
          <motion.div 
            animate={showText ? "visible" : "hidden"} 
            variants={textVariants} 
            className="px-3 py-1 text-[10px] uppercase font-bold text-slate-600 tracking-wider"
          >
            Enlaces Externos
          </motion.div>

          {/* External Links Items */}
          <a 
            href="http://www.ivss.gov.ve" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center p-3 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-emerald-400 transition-all duration-300"
          >
            <ExternalLink size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
            <motion.span 
              animate={showText ? "visible" : "hidden"} 
              variants={textVariants} 
              className="ml-4 font-medium text-sm whitespace-nowrap"
            >
              Portal IVSS
            </motion.span>
          </a>

          <a 
            href="http://faov.banavih.gob.ve" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center p-3 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-amber-400 transition-all duration-300"
          >
            <Building2 size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
            <motion.span 
              animate={showText ? "visible" : "hidden"} 
              variants={textVariants} 
              className="ml-4 font-medium text-sm whitespace-nowrap"
            >
              Banavih Online
            </motion.span>
          </a>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800/50 flex flex-col gap-2 shrink-0">
          <button 
            onClick={() => handleNavigation('settings')}
            className={`flex items-center p-2 transition-colors ${currentView === 'settings' ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
          >
              <Settings size={20} className="shrink-0" />
              <motion.span 
                animate={showText ? "visible" : "hidden"} 
                variants={textVariants} 
                className="ml-4 text-sm whitespace-nowrap"
              >
                Configuración
              </motion.span>
          </button>
          <button className="flex items-center p-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <LogOut size={20} className="shrink-0" />
              <motion.span 
                animate={showText ? "visible" : "hidden"} 
                variants={textVariants} 
                className="ml-4 text-sm whitespace-nowrap"
              >
                Cerrar Sesión
              </motion.span>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
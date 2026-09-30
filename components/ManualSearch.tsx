import React, { useState } from 'react';
import { 
  Search, 
  Eraser, 
  ScanLine,
  Loader2,
  AlertTriangle,
  Users,
  Cake,
  FileText,
  UserCheck,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { Citizen } from '../types';

const ManualSearch: React.FC = () => {
  // Estado local para los criterios de búsqueda
  const [form, setForm] = useState({
    cedula: '',
    p_nombre: '',
    s_nombre: '',
    p_apellido: '',
    s_apellido: ''
  });

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<Citizen[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Estado del Carrito (Expediente en Curso)
  const [suspects, setSuspects] = useState<Citizen[]>([]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const handleClear = () => {
    setForm({
      cedula: '',
      p_nombre: '',
      s_nombre: '',
      p_apellido: '',
      s_apellido: ''
    });
    setHasSearched(false);
    setSearchResults([]);
    setErrorMsg(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    const hasData = Object.values(form).some(val => val.trim().length > 0);
    if (!hasData) return;

    setIsSearching(true);
    setHasSearched(true);
    setErrorMsg(null);
    setSearchResults([]);

    try {
        const results = await api.searchIdentity(form);
        setSearchResults(results);
        if(results.length === 0) setErrorMsg("No se encontraron coincidencias en la base de datos.");
    } catch (error) {
        console.error("Error searching identity", error);
        setErrorMsg("Error de conexión con el servidor. Verifique la API.");
    } finally {
        setIsSearching(false);
    }
  };

  const addToSuspects = (person: Citizen) => {
    if (suspects.some(s => s.cedula === person.cedula)) return;
    setSuspects(prev => [...prev, person]);
  };

  const removeFromSuspects = (cedula: string) => {
    setSuspects(prev => prev.filter(s => s.cedula !== cedula));
  };

  // Función de formateo de fecha (DD/MM/YYYY)
  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr === '0000-00-00') return null;
    try {
        // Soporte para YYYY-MM-DD
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
  };

  return (
    <div className="w-full h-screen p-4 md:p-6 pt-20 md:pt-6 text-slate-200 flex flex-col xl:flex-row gap-6 overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: Formulario y Resultados (Maximizado) */}
        <div className="flex-1 flex flex-col min-h-0">
            
            {/* Header Compacto */}
            <div className="mb-3 shrink-0 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <ScanLine className="text-indigo-400" size={20} />
                        Radar Forense
                    </h2>
                    <p className="text-xs text-slate-400">Motor de Búsqueda de Identidad V4</p>
                </div>
            </div>

            {/* Formulario Compacto de Alta Densidad */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl mb-3 shrink-0">
                <form onSubmit={handleSearch} className="flex flex-col gap-3">
                    
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                        {/* Cédula - Columna Izquierda */}
                        <div className="md:col-span-1">
                             <input
                                type="text"
                                value={form.cedula}
                                onChange={(e) => handleChange('cedula', e.target.value)}
                                placeholder="Cédula (V-0000)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg h-9 px-3 text-sm font-mono tracking-wide text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                             />
                        </div>

                        {/* Nombres - Grid de 4 */}
                        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                            {['p_nombre', 's_nombre', 'p_apellido', 's_apellido'].map((field, i) => (
                                <input 
                                    key={field}
                                    // @ts-ignore
                                    value={form[field]}
                                    onChange={(e) => handleChange(field, e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg h-9 px-3 text-xs focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-700 font-medium"
                                    placeholder={['1er Nombre', '2do Nombre', '1er Apellido', '2do Apellido'][i]}
                                />
                            ))}
                        </div>

                        {/* Botones - Columna Derecha */}
                        <div className="md:col-span-1 flex gap-1">
                            <button
                                type="submit"
                                disabled={isSearching}
                                className={`flex-1 h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 ${isSearching ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                Buscar
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="h-9 w-9 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all flex items-center justify-center border border-slate-700"
                                title="Limpiar"
                            >
                                <Eraser size={14} />
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* TABLA DE RESULTADOS COMPACTA (Flex Table) */}
            <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col relative min-h-0">
                {/* Cabecera Sticky */}
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex text-[10px] uppercase font-bold text-slate-500 shrink-0 select-none">
                    <div className="w-24 shrink-0">Cédula</div>
                    <div className="flex-1">Nombre Completo</div>
                    <div className="w-24 text-center">NACIMIENTO</div>
                    <div className="w-24 text-right">Acción</div>
                </div>

                {/* Área Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {!hasSearched && (
                         <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                             <Search size={48} className="mb-2" />
                             <p className="text-sm">Ingrese criterios para iniciar...</p>
                         </div>
                    )}

                    {errorMsg && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                             <AlertTriangle size={32} className="mb-2 text-amber-500 opacity-80" />
                             <p className="text-sm">{errorMsg}</p>
                        </div>
                    )}

                    {searchResults.map((person, idx) => {
                        const isSelected = suspects.some(s => s.cedula === person.cedula);
                        const fechaFormatted = formatDate(person.fecha_nacimiento);

                        return (
                            <div 
                                key={person.cedula} 
                                className={`flex items-center px-4 py-2 border-b border-slate-800/40 hover:bg-slate-800 transition-colors group ${isSelected ? 'bg-indigo-900/10' : idx % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'}`}
                            >
                                <div className="w-24 shrink-0 font-mono text-indigo-400 text-xs font-bold">
                                    {person.cedula}
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="font-bold text-slate-300 text-xs truncate group-hover:text-white">
                                        {person.nombre_completo}
                                    </div>
                                </div>
                                <div className="w-24 text-center text-[10px] text-slate-400 flex justify-center items-center gap-1">
                                    {fechaFormatted ? (
                                        <><Cake size={10} className="text-slate-600" /> {fechaFormatted}</>
                                    ) : (
                                        <span className="text-slate-700">-</span>
                                    )}
                                </div>
                                <div className="w-24 text-right">
                                    <button
                                        onClick={() => addToSuspects(person)}
                                        disabled={isSelected}
                                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                                            isSelected 
                                            ? 'text-emerald-500 cursor-default'
                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-indigo-500/20'
                                        }`}
                                    >
                                        {isSelected ? 'Agregado' : 'Seleccionar'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Footer de Resultados */}
                <div className="bg-slate-950 px-4 py-1.5 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center shrink-0">
                    <span>Registros: {searchResults.length}</span>
                    <span>Fuente: BD Nacional</span>
                </div>
            </div>
        </div>

        {/* COLUMNA DERECHA: Carrito (Sidebar Compacto) */}
        <div className="w-full xl:w-72 shrink-0 flex flex-col min-h-0 h-48 xl:h-full border-t xl:border-t-0 xl:border-l border-slate-800 pl-0 xl:pl-4">
            <div className={`flex-1 rounded-xl border overflow-hidden flex flex-col transition-all h-full ${suspects.length > 0 ? 'bg-slate-900 border-indigo-500/30' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                <div className="bg-slate-950/80 p-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-slate-200 text-xs flex items-center gap-2">
                        <UserCheck size={14} className="text-emerald-400" />
                        Selección
                    </h3>
                    <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 rounded-md">
                        {suspects.length}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {suspects.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 text-[10px] italic p-4 text-center">
                            Lista vacía.
                        </div>
                    ) : (
                        suspects.map((suspect) => (
                            <div key={suspect.cedula} className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2 group hover:border-indigo-500/30 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-200 truncate">{suspect.nombre_completo}</p>
                                    <p className="text-[9px] font-mono text-indigo-400">{suspect.cedula}</p>
                                </div>
                                <button 
                                    onClick={() => removeFromSuspects(suspect.cedula)}
                                    className="p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {suspects.length > 0 && (
                    <div className="p-2 bg-slate-950/50 border-t border-slate-800 shrink-0">
                        <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow flex items-center justify-center gap-2 transition-all">
                            <FileText size={12} />
                            Crear Ficha
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ManualSearch;
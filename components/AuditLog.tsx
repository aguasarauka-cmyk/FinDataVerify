import React from 'react';

const AuditLog: React.FC = () => {
  return (
    <div className="p-8 text-white">
      <h2 className="text-2xl font-bold mb-4">Bitácora de Auditoría</h2>
      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
        <p className="text-slate-400">Este módulo mostrará el historial completo de acciones realizadas por los analistas, incluyendo fechas, usuarios y detalles de validación.</p>
      </div>
    </div>
  );
};

export default AuditLog;
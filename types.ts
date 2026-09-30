
// Data types based on PRD and Backend response structure

export interface FinancialDocument {
  id: number;
  fileName: string;
  bankName: string;
  primaryHolder: string;
  secondaryHolder?: string;
  endingBalance: number;
  statementDate: string; // Fecha del extracto (NO fecha de subida)
  address_search_text: string; // Dirección para geo-match
  audit_status: 'Auditado' | 'Pendiente';
  audit_riesgo?: 'Bajo' | 'Medio' | 'Alto';
  link_pdf?: string;
  es_importante?: boolean;
  es_completado?: boolean;
}

// CORRECCIÓN: Alineado con lo que devuelve api_search_identity.php
export interface Citizen {
  cedula: string;
  nombre_completo: string; // Antes era nombre + apellido separado
  estado_votacion?: string; // El código del CNE (ej: "01")
  score?: number;
  match_geo?: boolean;
  fecha_nacimiento?: string; // Opcional por si lo agregamos luego
}

export interface ValidationResult {
  ivss?: {
    empleador?: string;
    fecha_ingreso?: string;
    estatus?: string;
  };
  banavih?: {
    empresa?: string;
    telefono?: string;
  };
}

export type ViewState = 'dashboard' | 'manual_search' | 'important' | 'archived' | 'settings';

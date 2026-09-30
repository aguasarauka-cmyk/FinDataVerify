import { FinancialDocument, Citizen } from '../types';

const API_URL = "https://maroon-mole-493387.hostingersite.com/API";

// Datos de respaldo por si la red falla
const MOCK_DOCS: FinancialDocument[] = [
  {
    id: 1,
    fileName: "EXP-DEMO-001.pdf",
    bankName: "BANCO CENTRAL (DEMO)",
    primaryHolder: "USUARIO DE PRUEBA",
    secondaryHolder: "FIRMANTE SECUNDARIO DEMO",
    endingBalance: 1500.50,
    statementDate: "2023-12-31",
    address_search_text: "AVENIDA URDANETA, TORRE FINANCIERA, PISO 5",
    audit_status: "Pendiente",
    audit_riesgo: "Alto",
    link_pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    es_importante: true,
    es_completado: false
  }
];

/**
 * Normaliza los datos que vienen del Backend (PHP/MySQL)
 */
const normalizeDocument = (doc: any): FinancialDocument => {
  // 1. Captura de Nombres
  // Intentamos leer el campo de la BD, si no existe, usamos el titular para procesarlo
  let p_holder = doc.primaryHolder || doc.primary_holder || doc.titular || doc.titular1 || 'Titular Desconocido';
  let s_holder = doc.secondaryHolder || doc.secondary_holder || doc.secondaryHolderName || doc.co_titular || doc.titular2 || '';

  // Limpieza básica de etiquetas comunes en OCR
  p_holder = String(p_holder).replace(/^(TITULAR|CUENTA|NOMBRE)[:\s]*/i, '').trim();

  // --- LÓGICA INTELIGENTE: SEPARACIÓN DE NOMBRES ---
  // Como en tu BD no tienes la columna 'secondaryHolder', esta lógica es vital.
  // Analiza el string del titular para ver si hay dos personas.
  if (!s_holder) {
      // Caso 1: Salto de línea (Nombre1 \n Nombre2)
      if (p_holder.includes('\n')) {
         const parts = p_holder.split('\n');
         if (parts[1] && parts[1].trim().length > 2) {
             p_holder = parts[0].trim();
             s_holder = parts[1].trim();
         }
      } 
      // Caso 2: Separador " Y " o " & " o " AND "
      else if (p_holder.match(/\s(&|Y|AND)\s/i)) {
          const parts = p_holder.split(/\s(?:&|Y|AND)\s/i);
          if (parts.length > 1) {
            p_holder = parts[0].trim();
            s_holder = parts[1].trim();
          }
      }
      // Caso 3: Separador "," (Solo si parece formato: "Apellido Nombre, Apellido Nombre")
      else if (p_holder.includes(',')) {
          const parts = p_holder.split(',');
          // Validamos que ambas partes parezcan nombres (tengan espacios)
          if (parts.length === 2 && parts[0].trim().includes(' ') && parts[1].trim().includes(' ')) {
              p_holder = parts[0].trim();
              s_holder = parts[1].trim();
          }
      }
  }

  // --- LÓGICA DE FECHAS REFORZADA ---
  // Buscamos 'statementDate' (camelCase), 'statementdate' (lowercase), 
  // 'statementDate1' (por el error visual de phpMyAdmin) y otras variantes comunes.
  let rawDate = 
      doc.statementDate || 
      doc.statementDate1 || 
      doc.statementdate || 
      doc.statement_date || 
      doc.date || 
      doc.fecha || 
      'Sin fecha';
  
  // Limpieza: Si es null, undefined o fecha vacía de MySQL
  if (!rawDate || rawDate === '0000-00-00' || rawDate === '0000-00-00 00:00:00') {
      rawDate = 'Sin fecha';
  }

  return {
    id: doc.id || Math.random(), // Fallback ID si falta
    fileName: doc.fileName || doc.file_name || doc.archivo || 'Doc sin nombre',
    bankName: doc.bankName || doc.bank_name || doc.banco || 'Banco General',
    primaryHolder: p_holder,
    secondaryHolder: s_holder, // Ahora contendrá el dato extraído
    endingBalance: Number(doc.endingBalance || doc.ending_balance || doc.balance || 0),
    statementDate: rawDate,
    address_search_text: doc.address_search_text || doc.direccion || '',
    audit_status: doc.audit_status || (doc.status === 'Auditado' ? 'Auditado' : 'Pendiente'),
    audit_riesgo: doc.audit_riesgo || doc.riesgo || 'Bajo',
    link_pdf: doc.link_pdf || doc.pdf_url || null,
    es_importante: !!(doc.es_importante || doc.is_important || false),
    es_completado: !!(doc.es_completado || doc.is_completed || false)
  };
};

export const api = {
  getDocuments: async (filters: { q?: string; banco?: string; limit?: number; fecha_inicio?: string } = {}): Promise<FinancialDocument[]> => {
    try {
      const params = new URLSearchParams();
      
      if (filters.q) params.append('q', filters.q);
      if (filters.banco) params.append('banco', filters.banco);
      if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
      
      // Solicitamos 5000 para traer todo
      params.append('limit', (filters.limit || 5000).toString()); 
      params.append('_ts', Date.now().toString());

      const response = await fetch(`${API_URL}/api_get_documents.php?${params.toString()}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) throw new Error("Error de Red");

      const data = await response.json();
      
      if (data && data.status === 'success' && Array.isArray(data.data)) {
        return data.data.map(normalizeDocument);
      }
      return MOCK_DOCS;
    } catch (error) {
      console.warn("Usando datos de respaldo por error de API", error);
      return MOCK_DOCS;
    }
  },

  searchIdentity: async (params: { cedula?: string, p_nombre?: string, s_nombre?: string, p_apellido?: string, s_apellido?: string }): Promise<Citizen[]> => {
    // Estructura estricta para el payload (Body JSON)
    const payload = {
      cedula: params.cedula || '',
      p_nombre: params.p_nombre || '',
      s_nombre: params.s_nombre || '',
      p_apellido: params.p_apellido || '',
      s_apellido: params.s_apellido || ''
    };

    try {
      const response = await fetch(`${API_URL}/api_search_identity.php`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
          const errorText = await response.text();
          console.error("API Response Error:", errorText);
          throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'error') {
         console.warn("API Error:", data.message);
         // Opcional: throw new Error(data.message);
      }

      return data.results || [];
    } catch (error) {
      console.error("Critical Error searching identity:", error);
      throw error; // Propagate error to UI to handle loading state
    }
  },

  validateExternal: async (target: string, cedula: string) => {
    const res = await fetch(`${API_URL}/api_external_val.php?target=${target}&cedula=${cedula}`);
    return res.json();
  },

  getFicha: async (docId: number) => {
    const res = await fetch(`${API_URL}/api_ficha.php?document_id=${docId}`);
    return res.json();
  },

  saveFicha: async (payload: any) => {
    const res = await fetch(`${API_URL}/api_ficha.php`, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};
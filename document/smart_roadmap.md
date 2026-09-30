# FinDataVerify - Smart Roadmap

## Estado Actual
**Fase:** 4 - Refinamiento y Entrega (En Curso)
**Estado del Sistema:** 🟡 **Operativo (Modo Híbrido)**. El Frontend está completo. El Backend requiere actualización manual de archivos en Hostinger para permitir conexiones CORS externas. El sistema funciona actualmente con **Mock Data Fallback** para evitar bloqueos.

---

## Fases del Proyecto

### Fase 1: Cimientos (Completado ✅)
- [x] Configuración de Vite + Tailwind + Fonts (Inter & JetBrains Mono).
- [x] Definición de arquitectura de carpetas.
- [x] Implementación de Sidebar con micro-interacciones.

### Fase 2: Dashboard Principal (Completado ✅)
- [x] Integración de servicio `api_get_documents`.
- [x] Tabla de Alta Densidad con scroll personalizado.
- [x] Lógica de búsqueda client-side.
- [x] Indicadores de Límite de Servidor (Alerta 500 registros).

### Fase 3: Workspace de Auditoría (Completado ✅)
- [x] Navegación Master-Detail (Overlay Workspace).
- [x] Visor PDF integrado.
- [x] Módulo Radar (Búsqueda de identidad).
- [x] Módulo de Validaciones (IVSS/Banavih simulados).
- [x] Guardado de Fichas (Sincronización con BD).

### Fase 4: Refinamiento y Entrega (En Progreso 🚧)
- [x] **Arquitectura de Resiliencia:** Implementación de `try/catch` global en servicios para conmutar a datos de prueba en fallos de red.
- [x] **Refinamiento de Datos:** Campo editable para Dirección de Sucursal en Workspace (Soporte para Geo-Match).
- [ ] **Sincronización Backend:** Subida de archivos PHP con headers CORS corregidos a Hostinger.
- [ ] **Responsive Design:** Ajustes finos para tablets y laptops pequeñas.
- [ ] **Login:** Pantalla de autenticación (JWT o Básica).

---

## Próximos Pasos (Inmediatos)
1.  Subir archivos de `backend_reference/` a Hostinger.
2.  Verificar en la consola del navegador que el mensaje "Switching to Mock Data Mode" desaparezca.
3.  Realizar una prueba de flujo completo (Buscar -> Validar -> Guardar) con la base de datos real.
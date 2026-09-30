# FinDataVerify - Design System

## Concepto Visual: "Intelligence Dark"
Una estética diseñada para uso prolongado en entornos de baja luz, priorizando el contraste de datos y la reducción de fatiga visual. Inspirado en interfaces de ciberseguridad y terminales financieras modernas.

---

## Paleta de Colores

### Superficies
| Nombre | Tailwind | HEX | Uso |
| :--- | :--- | :--- | :--- |
| **Void** | `bg-slate-950` | `#020617` | Fondo principal de la aplicación. |
| **Glass** | `bg-slate-900/50` | N/A | Paneles flotantes, sidebars, headers (con backdrop-blur). |
| **Surface** | `bg-slate-800` | `#1e293b` | Bordes, separadores y fondos de inputs. |

### Datos y Estados
| Nombre | Tailwind | Uso |
| :--- | :--- | :--- |
| **Indigo Beam** | `text-indigo-400` | Elementos interactivos principales, pestañas activas, branding. |
| **Emerald Signal** | `text-emerald-400` | Saldos positivos, validaciones exitosas (IVSS/Banavih), estatus "Auditado". |
| **Amber Warning** | `text-amber-400` | Estatus "Pendiente", alertas de riesgo medio, advertencias de límite de datos. |
| **Crimson Alert** | `text-red-400` | Saldos negativos, errores críticos de API, desconexión. |

---

## Tipografía

### Inter (UI Principal)
Utilizada para toda la navegación, etiquetas, botones y textos descriptivos.
*   *Pesos:* Regular (400) para cuerpo, Medium (500) para botones, Bold (700) para encabezados.

### JetBrains Mono (Datos Financieros)
Utilizada exclusivamente para **cifras, fechas, IDs, números de cuenta y saldos**.
*   Asegura la alineación vertical de los dígitos en las tablas de alta densidad.

---

## Patrones de Interacción & Animación

### 1. El "Deslizamiento" (Workspace)
El panel de trabajo no aparece de golpe; se desliza (`x: '100%' -> 0`) cubriendo la vista, emulando sacar un expediente físico de un archivador.

### 2. Tabulación Líquida
El indicador de pestaña activa en el Workspace utiliza `layoutId` de Framer Motion para deslizarse orgánicamente entre las opciones.

---

## Feedback del Sistema (Estados de Red)

### Estado: Cargando
*   **Visual:** Icono `Loader2` con animación `spin` infinita.
*   **Color:** Indigo-500.
*   **Ubicación:** Centro de tablas o sobrecubriendo el botón de acción activa.

### Estado: Fallo de Conexión (Resiliencia)
*   **Visual:** La aplicación **no** muestra pantallas de error bloqueantes.
*   **Comportamiento:** Se degrada silenciosamente al "Modo Offline" (Mock Data).
*   **Indicador:** Mensaje de advertencia `console.warn` (Nivel Desarrollador) y Toast Notification en caso de fallo de guardado (Nivel Usuario).

### Estado: Éxito
*   **Visual:** Icono `CheckCircle2` con animación de entrada.
*   **Color:** Emerald-400.
*   **Feedback:** Toast flotante en la esquina inferior derecha.
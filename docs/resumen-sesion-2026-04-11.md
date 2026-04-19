# Resumen de Sesión — 11 de Abril 2026

## Studio IURIS — Sesión de desarrollo

---

## 1. Rediseño completo de Noticias Jurídicas

### Layout editorial tipo The Economist
- Rediseño completo del viewer público con densidad editorial
- Hero section con hasta 3 noticias destacadas (1 principal + 2 secundarias)
- Grid de 3 columnas para noticias recientes
- Lista densa para noticias anteriores
- Sin imágenes — puro texto editorial

### 16 fuentes de noticias (10 nuevas)
| # | Fuente | Rama |
|---|---|---|
| 1-6 | BCN, BCN Boletín, PJUD, TC, Diario Oficial, Colegio Abogados | (originales) |
| 7 | Fiscalía de Chile | Penal |
| 8 | Dirección del Trabajo | Laboral |
| 9 | Contraloría General | Administrativo |
| 10 | SII | Tributario |
| 11 | CMF | Comercial |
| 12 | Defensoría Penal Pública | Penal |
| 13 | Cancillería | Internacional |
| 14 | Min. de Justicia y DDHH | Transversal |
| 15 | Min. del Trabajo | Laboral |
| 16 | Min. de Hacienda | Tributario |

### Colores por materia del derecho
- 10 ramas con paleta completa (bg light/dark + accent)
- Al seleccionar una materia, el fondo completo de la página cambia
- Civil (azul petróleo), Penal (rojo), Constitucional (púrpura), Laboral (verde), etc.

### Categorías nuevas
- Columna de Opinión (con color bronce dorado)
- Carta al Director (con color azul formal)
- Editorial (con color burdeos)
- Usuarios pueden enviar columnas/cartas para revisión del admin

### Interacción de usuario (Premium)
- Comentarios simples en noticias
- Guardar/bookmark noticias
- Compartir: WhatsApp, X, LinkedIn, Email, copiar enlace, publicar como Obiter Dictum
- Modal de OD con preview de la noticia + textarea de 128 chars

### Panel Admin mejorado
- Batch actions: checkboxes + seleccionar todo + aprobar/eliminar en lote
- Modal de aprobación con: preview, sugerencia IA, categoría, rama, comentario editorial
- Título editable + botón "Usar sugerencia IA"
- Dropdown de filtro por rama del derecho
- 16 fuentes en el selector
- Auto-borrado de pendientes > 3 días

### IA y scraping
- Resúmenes extraídos del artículo fuente (gratis, sin IA)
- Para leyes: GPT-4o-mini genera título descriptivo, motivo, número de ley, leyes modificadas (~$0.30/mes)
- PJUD filtrado: excluye causas de sala, solo noticias institucionales
- Cron cambiado a 6:00 AM UTC

---

## 2. Fixes de producción

### Mobile nav overlap
- Pomodoro pill y ThemePill subidos a `bottom-20` en mobile (antes tapaban la nav inferior)

### Aceptar solicitud de colegas
- Error handling visible: ahora muestra toast con error real del API
- Backend: try/catch + logging estructurado en `/api/colegas/respond`

### Notification Bell + Buscador de usuarios
- Bell con badge de no leídas integrada en user bar
- Buscador con debounce 300ms, resultados en dropdown, click → perfil

### Resend centralizado
- `EMAIL_FROM` centralizado en `lib/resend.ts`
- Lazy-init pattern para no romper build sin API key
- 5 archivos actualizados de `noreply@lexamen.cl` a constante

---

## 3. Dashboard — Stats sincronizadas

- Flashcards dominadas: umbral cambiado de `repetitions >= 3` a `>= 1`
- Racha actual: ahora cuenta los 11 módulos de estudio (no solo flashcards)
- Actividad reciente: suma los 11 módulos (antes solo 3)
- Eliminadas barras "Tu Progreso" del dashboard principal

---

## 4. Beta Banner

- Banner fijo superior en todo el dashboard
- Controlado por `BETA_MODE = true` en `lib/config.ts`
- Botón "Reportar bug" con mailto pre-poblado
- Cierre persistente en localStorage
- Cambiar a `false` para lanzamiento público

---

## 5. Layout — Headers edge-to-edge

- Todos los headers de sección (título + logo + línea) van de borde a borde
- Contenido mantiene `max-w` para no estirarse demasiado
- Estructura: header con padding propio → línea sin padding → contenido con max-w
- Sidebars publicitarios en layout global (160px cada lado, desktop XL+)

### Páginas actualizadas (~30)
Flashcards, MCQ, V/F, Definiciones, Completar, Errores, Ordenar, Relacionar, Timeline, Simulacro, Colegas, Causas, Instituciones, Índice Maestro, Estadísticas, Ranking, Ranking Causas, Liga, Diario, Debates, Expediente, Calendario, Sala, Eventos, Pasantías, Ofertas, Estudios, Noticias, Perfil, Progreso

---

## 6. Obiter Dictum — Límite 128 caracteres

- Máximo cambiado de 1000 chars / 200 palabras a **128 chars / 30 palabras**
- Contador en vivo (45/128)
- Textarea más compacto (3 rows)
- Validación en frontend + backend

---

## 7. Masthead

- "IURIS" ahora en fuente **Playfair Display** (antes Cormorant)
- Animación letter-by-letter y shrink effect siguen funcionando

---

## 8. Deploy

- Producción en https://studio-iuris.vercel.app
- 8 variables de entorno configuradas en Vercel
- DATABASE_URL con Transaction pooler (6543) en Vercel + local
- GitHub auto-deploy conectado

---

## Schema changes

- `NoticiaJuridica`: +tituloSugerido, +motivoLey, +numeroLey, +leyesModificadas, +comentarioAdmin
- `NoticiaComentario`: nuevo modelo (comentarios en noticias)
- `NoticiaGuardada`: nuevo modelo (bookmarks de noticias)
- Relaciones agregadas a User

## Archivos creados
- `lib/derecho-colors.ts` — colores por rama del derecho
- `lib/config.ts` — BETA_MODE flag
- `app/api/noticias/[id]/comentarios/route.ts`
- `app/api/noticias/[id]/guardar/route.ts`
- `app/api/noticias/submit/route.ts`

## Pendiente para mañana
- Animación splash de entrada (logo con espada que se levanta + anillo giratorio)
- Requiere SVG en capas separadas (figura, espada, anillo)

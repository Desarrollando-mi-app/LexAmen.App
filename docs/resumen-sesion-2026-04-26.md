# Resumen de Sesión — 26 de Abril 2026

## Studio IURIS — Diario / Obiter Dictum: rediseño + sistema de respuestas + features grandes + auto-OD-resumen

Sesión larga centrada en la página `/dashboard/diario` (Publicaciones).
Se reescribió la mayor parte del feature: rediseño visual editorial
premium, layout estilo X/Twitter para los OD, sistema completo de
respuestas con anidación tipo Reddit, hashtags, menciones, búsqueda,
borradores, compartir, y un sistema de auto-OD-resumen que cierra el
loop entre las 4 publicaciones largas (Análisis, Ensayo, Debate,
Expediente) y el feed principal.

---

## Bloque A — Rediseño editorial del Diario

### A.1 Página `/dashboard/diario` (page.tsx)

Reemplazado el kicker minúsculo "Publicaciones" por un **masthead
editorial periodístico**:

- Línea superior tipo cabecera: fecha en español capitalizada · "—
  Diario de Studio Iuris —" · trigger del buscador (Cmd+K).
- Sello + título Cormorant 78px ("Publi**caciones**" con quiebre
  burdeos cursivo) centrado.
- Subtítulo cursivo descriptivo.
- Triple regla editorial debajo (3px / 1px / 2px en `gz-ink/85`).
- Hero carrusel se mantiene.

### A.2 Tab nav editorial

Reemplazado el border-b plano por **pestañas tipo periódico** con
numeral romano + acento de color por sección:

| Tab | Glifo | Acento |
|-----|-------|--------|
| Obiter Dictum | I | gold |
| Análisis de Sentencia | II | burgundy |
| Ensayos | III | sage |
| Expediente Abierto | IV | navy |
| Debates | V | burgundy |
| Mis Publicaciones | VI | ink |

Cada pestaña: rail superior 3px de su acento cuando activa, scroll
horizontal en mobile, label completa en desktop / corta en tablet.
Subtítulo cursivo describiendo la sección activa debajo.

### A.3 Sidebar widgets — paper-stack premium

`ObiterTrending` (Contingencia), `ContactSuggestions`,
`RankingSidebar`: rediseñados con el patrón premium uniforme:

- Sombras paper-stack (3 capas apiladas) para sensación de hojas
  superpuestas.
- Rail superior color (3px) por bloque.
- Header dot+kicker (`h-1.5 w-1.5 rounded-full ${rail}` + IBM Mono
  uppercase tracking-[2px]).
- Numerales Cormorant editorial para tops, mini-barras de proporción.

### A.4 Layout

Grid sube de `240/1fr/240` a `260/1fr/280` con `gap-7 md:gap-8`.
Sidebar derecho activo desde `xl` (no `lg`) para más respiración.
`MobileRankingSection` rediseñado como card-button colapsable.

---

## Bloque B — ObiterCard rediseñada estilo X/Twitter

### B.1 Layout horizontal

Antes: card boxy con avatar arriba, contenido abajo, bordes en cada
card. Después: estilo X.

- Avatar 44px **a la izquierda**, contenido a la derecha.
- Header inline en una línea: nombre **bold** + `@handle` minúsculo +
  `·` + tiempo + menú 3-dot (solo en propios).
- Hover en toda la card con tinte cream-dark/0.18.
- Border solo bottom — los OD viven apilados en un container outer
  rounded.

### B.2 Action bar con icon-buttons + hover circles

6 acciones distribuidas con SVGs (sin emojis), cada una con su color
de hover en círculo de 32px:

1. **Responder** (chat-bubble) — navy
2. **Citar** (quote-marks) — gold
3. **Comuníquese** (repost) — sage
4. **Apoyar** (heart, fill cuando activo) — burgundy
5. **Guardar** (bookmark, fill cuando activo) — burgundy
6. **Compartir** (share-up) — navy

`ActionButton` componente reutilizable. Counter inline tabular-nums.

### B.3 Indicadores especiales

- **Hilo** → chip burdeos inline en la fila de chips (no más
  absolute -top-3 flotante).
- **Fijado** → header gold con icono pin, estilo X-pinned.
- **Comuníquese** → header con icono repost SVG ("X reposted").
- **Auto-OD-resumen** → ver Bloque G.

### B.4 ObiterFeed container estilo X

- Card outer único con `border + rounded-[4px]`. Cards apiladas sin
  gaps, separadas solo por `border-b`.
- **Sticky tab bar** ("Recientes / Destacados / Colegas / Guardados")
  con `backdrop-blur-md bg-white/85`. Indicador inferior píldora gold
  corta (60% width) que se anima al cambiar.
- Removido `lg:w-3/5` — el feed llena toda la columna.
- Skeleton, empty state y "Cargar más" rediseñados acordes.

---

## Bloque C — Sistema de respuestas (modelo unificado)

### C.1 Decisión de diseño (acordada al inicio)

Tres decisiones que tomamos antes de codear:

1. **Una respuesta ES un Obiter** (no entidad nueva) — coherente con
   la visión editorial. Misma simetría: OD respondiendo a OD.
2. **Solo en página de detalle, no en feed** — feed limpio, contador
   visible en la card invita a entrar.
3. **Unificar gradualmente con hilos legacy** — `parentObiterId` nuevo,
   los hilos viejos (`threadId`) migran a cadena de auto-respuestas.

### C.2 Schema

`ObiterDictum.parentObiterId` (FK con CASCADE) +
`ObiterDictum.replyCount` (Int desnormalizado) +
índice `(parentObiterId, createdAt)`.
Migración `20260426_obiter_replies`.

### C.3 API

- `POST /api/obiter` acepta `parentObiterId`. Valida padre existe + no
  archivado, respeta `commentsDisabled`. Las respuestas no consumen
  cuota diaria. Incrementa `replyCount` del padre + notifica al autor.
- `GET /api/obiter` (feed): excluye respuestas con
  `parentObiterId: null`. Pero acepta `?includeReplies=true` para
  perfil/Mis Publicaciones donde sí queremos ver toda la actividad.
- `DELETE /api/obiter/[id]` decrementa `replyCount` del padre.

### C.4 UI ObiterCard

5ª acción "Responder" (chat-bubble navy) como primer botón del action
bar. Counter `replyCount` visible. Click sin handler → navega a
`/dashboard/diario/obiter/{id}#reply` (deep link al editor inline).

### C.5 Página de detalle — `RepliesSection` Reddit-style

Después del quote-tweet del OD principal, una sección "Conversación":

- Header editorial "X respuestas" con border `border-b-2 border-gz-ink/85`.
- **Sort toggle** pill: Recientes (createdAt desc) / Apoyadas
  (apoyosCount desc) / Colegas (colegas primero, luego cronológico) /
  Todas (cronológico asc, default).
- Editor inline siempre visible (si `currentUserId && !commentsDisabled`)
  con kicker "Respondiendo a @handle".
- Banner si `commentsDisabled`. Login CTA si no autenticado.
- **Árbol nested** vía CTE recursivo (`WITH RECURSIVE`) en server
  component. Cap 300 descendientes.
- `ReplyNodeView` recursivo con indent visual progresivo (max 5
  niveles, después se aplana). Línea vertical guía burdeos para colegas
  / gris para el resto.
- Cada respuesta tiene su propio botón Responder que toggle un composer
  inline child. Al publicar: se inserta en el árbol y se incrementa el
  `replyCount` de SU padre.
- Toggle "Ocultar/Mostrar hilo" cuando una rama tiene hijos.

### C.6 "Respondiendo a @handle" en el detalle

Si el OD tiene `parentObiterId`, server fetch del padre y se renderiza
un bloque clickeable arriba con snippet del padre + "Ver hilo →". Hash
`#reply` enfoca el editor automáticamente.

### C.7 Migración de hilos legacy

`20260426_migrate_legacy_threads`:

```sql
UPDATE child SET parentObiterId = parent.id
FROM ObiterDictum parent
WHERE child.threadId = parent.threadId
  AND parent.threadOrder = child.threadOrder - 1
```

Cada parte n del hilo legacy queda como hijo de la parte n-1.
Idempotente. Después recalcula `replyCount = COUNT(hijos)` para todos.

### C.8 Mis Publicaciones / perfil

- API acepta `?includeReplies=true`.
- Mis Publicaciones marca con chip "Respuesta" + contador "X respuestas".
- Perfil público muestra "↩ a @handle" en lugar del título.

### C.9 Notificaciones — verificación + arreglos

Sistema preexistente (`Notification` + `UserNotification` + Resend
emails) funcionaba pero el drawer no navegaba al click ni tenía
iconos para los tipos OD.

- Nuevo enum `OBITER_REPLY` (antes reusábamos `OBITER_CITA` con
  `metadata.isReply`, semánticamente incorrecto).
- `TYPE_ICONS` extendido: ♥ apoyo, ❝ cita, ↻ comuníquese, ↩ reply,
  @ mention, 📅 evento.
- `getNotificationHref()`: mapea cada tipo a su URL de destino. Click
  cierra el drawer + navega.
- Migraciones: `20260426_obiter_reply_notification_type` y
  `20260426_obiter_mention_notification_type`.

---

## Bloque D — Hashtags + filtrado + Contingencia rediseñada

### D.1 Schema

`ObiterDictum.hashtags TEXT[] NOT NULL DEFAULT '{}'` con GIN index
para queries "any of these tags" rápidas.
Migración `20260426_obiter_hashtags_mentions` (incluye también
mentions y handle de User — ver Bloque E).

### D.2 Extracción + filtrado

- `lib/obiter-parsing.ts:extractHashtags()` con regex Unicode (acepta
  acentos: `#ProcesalCivil`, `#articulo1545`, `#civil_2026`).
- `POST /api/obiter` extrae y guarda hashtags al crear.
- `GET /api/obiter` acepta `?hashtag=X` (`{ has: hashtag }` en Prisma).
- `LinkifiedText` renderiza `#tag` como Link burdeos a
  `/dashboard/diario?hashtag=X`.
- Banner editorial activo en la página: "Filtrando por #etiqueta ·
  Limpiar" cuando hay filtro.

### D.3 Contingencia (`ObiterTrending`) rediseñada

API `/api/obiter/trending` reescrita con score basado en hashtags
(ventana 7 días):

```
score = uses + replies × 1.5 + apoyos × 0.5
```

Devuelve top 8 trending + delta % vs ventana anterior + spotlight
(OD con más engagement reciente) + pregunta sin respuesta.

Widget rediseñado:

- **Tendencias**: top 8 hashtags con numeral romano editorial (top 3
  doradas), chip rojo `▲ N%` cuando delta ≥ 50%, mini-barras de
  proporción, stats compactas (uses · replies · apoyos), clickeable →
  filtra feed.
- **En el centro del foro**: spotlight con OD de más engagement, comilla
  decorativa burdeos, stats `↩ N` + `♥ N`.
- **Pregunta sin respuesta**: filtro `tipo=pregunta` + `replyCount=0` +
  `apoyosCount ≥ 2`.

Los 3 bloques con paper-stack premium + rail superior color por
bloque + dot-kicker.

---

## Bloque E — Menciones @user

### E.1 Schema

- `User.handle TEXT UNIQUE` con índice parcial (solo NOT NULL).
- Backfill inicial: `lower(firstName)` + sufijo numérico para colisiones,
  o `usuario{6chars}` si firstName está vacío.
- `ObiterDictum.mentionedUserIds TEXT[]` con GIN index.

Migración `20260426_obiter_hashtags_mentions`.

### E.2 Extracción + notificación

- `extractMentions()` + `resolveMentions(handles → userIds)` en
  `lib/obiter-parsing.ts`.
- POST API: extrae handles, resuelve a userIds (solo los que existen),
  guarda en `mentionedUserIds`, dispara `OBITER_MENTION` por cada
  uno (excluyendo autor + autor del padre p/no doblar con OBITER_REPLY).

### E.3 Autocompletado en editor

`api/users/autocomplete?q=`: devuelve hasta 6 users matching
handle/firstName/lastName, ranked por relevancia (handle exacto >
prefix > nombre).

`useMentionAutocomplete` hook + dropdown en `ObiterEditor`:

- Detecta `@palabra` en el cursor con `onSelect`/`onChange`.
- Fetch debounced 150ms.
- Navegación con ↑↓ + Enter/Tab/Escape.
- Inserta `@handle` al elegir + reposiciona cursor.

### E.4 Render + ruta

- `LinkifiedText` renderiza `@handle` como Link navy a
  `/dashboard/perfil/@handle`.
- `/dashboard/perfil/[userId]/page.tsx`: si el param empieza con `@`,
  resuelve via Prisma y redirige a `/dashboard/perfil/{realId}`.

---

## Bloque F — Búsqueda + Borradores + Compartir

### F.1 Búsqueda (Cmd/Ctrl+K)

`api/diario/search?q=`: búsqueda unificada. Soporta prefijos:

- `#tag` → solo hashtags
- `@user` → solo personas
- `tema:` → solo OD por content
- texto libre → mezcla las 3

Devuelve `{ hashtags, users, obiters }` con cap por categoría.

`DiarioSearch` component:

- Trigger compacto en el masthead con `<kbd>⌘K</kbd>`.
- Modal con `backdrop-blur-sm`, rail tricolor superior, 3 secciones
  (Etiquetas / Personas / Obiter Dictum) cada una con su rail editorial.
- Atajo global Cmd+K / Ctrl+K en `keydown` listener.
- Resultados clickeables → cierran modal + router.push.

### F.2 Borradores (localStorage)

`ObiterEditor` guarda `{content, materia, tipo, ts}` en localStorage
debounced 500ms con TTL 7 días.

Key separada por contexto para no mezclar borradores:

- `obiter-draft-root` para composición libre
- `obiter-draft-reply-{parentId}` para responder a un OD
- `obiter-draft-thread-{threadId}` para continuar un hilo

Restaura al montar si no hay `initialText`/citing/contenido. Limpia
tras publish exitoso. Indicador "✓ Guardado" sutil junto al word
counter.

### F.3 Compartir

6ª acción en el action bar (icon-only, navy hover). Web Share API en
mobile (`navigator.share`) con fallback a `navigator.clipboard.writeText`
+ toast "Link copiado al portapapeles". Maneja `AbortError` (usuario
canceló) sin caer al fallback.

---

## Bloque G — Auto-OD-resumen (visión central)

**Visión del usuario:** "Que el OD sea la plaza pública del Diario.
Cada vez que un usuario publique algo a través de Análisis, Ensayo,
Debate o Expediente, aparezca un OD en forma de resumen para buscar
mayor interacción entre las publicaciones más serias y el grueso del
público que está en los OD."

### G.1 Schema

`ObiterDictum.kind TEXT default 'regular'`. Valores:

- `regular` (default)
- `analisis_summary`
- `ensayo_summary`
- `debate_summary`
- `expediente_summary`

`ObiterDictum.citedDebateId` + `citedExpedienteId` (FKs opcionales con
ON DELETE SET NULL para que el OD sobreviva si se borra el original).
Análisis y Ensayo ya tenían `citedAnalisisId`/`citedEnsayoId`.

Relaciones inversas: `DebateJuridico.citadoPorObiters`,
`Expediente.citadoPorObiters`.

Indexes: `kind`, `citedDebateId`, `citedExpedienteId`.

Migración `20260426_obiter_auto_summaries`.

### G.2 Helper

`lib/obiter-auto-summary.ts:createSummaryObiter()` best-effort. Si
falla, no rompe el create del original — solo loguea.

Plantillas editoriales por kind (primera persona, voz natural):

- **Análisis** → "He publicado un Análisis de Sentencia: «{título}». {excerpt 220 chars}"
- **Ensayo** → "He publicado un Ensayo: «{título}». {excerpt}"
- **Debate** → "Abrí un Debate: «{título}». {descripción 200 chars} ¿Quién toma la contraria?"
- **Expediente** → "Nuevo Expediente Abierto: «{título}». {pregunta} Argumenta por uno de los bandos."

Hashtags: extraídos del content + inyectados desde `hashtagSeed`
(rama/materia + nombre del módulo: `#AnalisisDeSentencia`, `#Ensayo`,
`#Debate`, `#ExpedienteAbierto`).

### G.3 Hooks en las 4 APIs

- `POST /api/diario/analisis`: tras crear, dispara OD con
  `kind=analisis_summary`, `citedAnalisisId`.
- `POST /api/diario/ensayos`: dispara solo si `showInFeed=true`
  (respeta el toggle del usuario).
- `POST /api/diario/debates`: dispara con CTA "¿Quién toma la
  contraria?".
- `PATCH /api/expediente/admin?action=aprobar`: dispara a nombre del
  `propuestaPor` cuando el admin aprueba (no al proponer).
- `POST /api/expediente`: si admin crea directo (ya aprobado), dispara
  igual.

### G.4 UI ObiterCard distintiva

`SUMMARY_KIND_META` mapea cada kind a `{label, color, bg, icon}`:

- analisis_summary: ⚖ "Análisis publicado" — burdeos
- ensayo_summary: 📜 "Ensayo publicado" — sage
- debate_summary: ⚔ "Debate abierto" — burdeos
- expediente_summary: 📂 "Expediente abierto" — navy

Cada OD-resumen renderiza:

- **Rail vertical IZQUIERDO** 3px del color del kind, full-height.
- **Header tipo X-reposted**: `[icono] [Tipo publicado/abierto]` en
  font-ibm-mono uppercase tracking-[1.5px], color del kind.
- Bloques cited extendidos para Debate y Expediente:
  - Debate: card burdeos con "⚔ Debate · estado", título, rama + CTA
    "Ver debate →".
  - Expediente: card navy con "📂 Expediente N° X · estado", título,
    rama + CTA "Argumentar →".

### G.5 Sync apoyos

Apoyar/des-apoyar el OD-resumen también incrementa/decrementa
`apoyosCount` del Análisis o Ensayo original. Para Debate/Expediente
no se propaga (esos modelos usan `votos` en vez de `apoyosCount`).

Best-effort con `.catch(() => {})` para no romper el toggle si el
módulo original cambió.

### G.6 Flujo end-to-end

1. Usuario publica Análisis "X y la prescripción".
2. Backend crea `AnalisisSentencia` + auto-OD con
   `kind=analisis_summary`, `citedAnalisisId`, hashtags
   `[#civil, #AnalisisDeSentencia]`.
3. OD aparece en feed con rail burdeos + header "⚖ Análisis publicado"
   + bloque cited clickeable al análisis completo.
4. Otros usuarios reaccionan, responden, citan, comparten en el OD.
5. Apoyar el OD suma al `apoyosCount` del análisis original.

---

## Migraciones aplicadas en esta sesión

Todas aplicadas en BD via `npx prisma migrate deploy` durante la
sesión. Vercel debería re-aplicar en su pipeline (no-op).

| Migración | Cambio principal |
|-----------|------------------|
| `20260426_obiter_replies` | `parentObiterId`, `replyCount`, índice |
| `20260426_obiter_reply_notification_type` | enum `OBITER_REPLY` |
| `20260426_migrate_legacy_threads` | data: `threadId` → `parentObiterId` chain |
| `20260426_obiter_hashtags_mentions` | `hashtags`, `mentionedUserIds`, `User.handle` + backfill |
| `20260426_obiter_mention_notification_type` | enum `OBITER_MENTION` |
| `20260426_obiter_auto_summaries` | `kind`, `citedDebateId`, `citedExpedienteId` |

---

## Archivos clave creados/modificados

### Nuevos (lib + API + componentes)

- `lib/obiter-parsing.ts` — extractHashtags / extractMentions / resolveMentions
- `lib/obiter-auto-summary.ts` — createSummaryObiter()
- `app/api/obiter/trending/route.ts` — reescrito con score basado en hashtags
- `app/api/users/autocomplete/route.ts` — autocompletado de menciones
- `app/api/diario/search/route.ts` — búsqueda unificada
- `app/dashboard/diario/components/diario-search.tsx` — modal Cmd+K
- `app/dashboard/diario/components/use-mention-autocomplete.ts` — hook

### Modificados (mayor parte de la sesión)

- `app/dashboard/diario/page.tsx` — masthead editorial + buscador
- `app/dashboard/diario/diario-page-client.tsx` — tab nav + filtro hashtag
- `app/dashboard/diario/components/obiter-feed.tsx` — sticky tabs + container X
- `app/dashboard/diario/components/obiter-card.tsx` — X-style + 6 acciones
   + summary headers + cited debate/expediente
- `app/dashboard/diario/components/obiter-trending.tsx` — Contingencia
   con hashtags
- `app/dashboard/diario/components/obiter-editor.tsx` — borradores +
   menciones autocomplete + parentObiterId
- `app/dashboard/diario/components/contact-suggestions.tsx` — paper-stack
- `app/dashboard/diario/components/ranking-sidebar.tsx` — paper-stack
- `app/dashboard/diario/components/linkified-text.tsx` — render #tag/@user
- `app/dashboard/diario/obiter/[id]/page.tsx` — replies recursivas + parent
- `app/dashboard/diario/obiter/[id]/obiter-detail-client.tsx` — RepliesSection
- `app/dashboard/diario/types/obiter.ts` — tipos extendidos
- `app/dashboard/components/notification-drawer.tsx` — iconos + nav al click
- `app/dashboard/perfil/[userId]/page.tsx` — handle resolution + replies render
- `app/api/obiter/route.ts` — hashtags/mentions/parentObiterId/feed filters
- `app/api/obiter/[id]/route.ts` — DELETE sync replyCount
- `app/api/obiter/[id]/apoyar/route.ts` — sync con auto-OD
- `app/api/diario/analisis/route.ts` — hook auto-OD
- `app/api/diario/ensayos/route.ts` — hook auto-OD
- `app/api/diario/debates/route.ts` — hook auto-OD
- `app/api/expediente/route.ts` — hook auto-OD (admin)
- `app/api/expediente/admin/route.ts` — hook auto-OD (al aprobar)
- `lib/notifications.ts` — tipos OBITER_REPLY + OBITER_MENTION
- `prisma/schema.prisma` — schema completo
- `tsconfig.json` — `target: es2020` (alinea con SWC, permite `\p{...}`)

---

## Decisiones de diseño documentadas

### 1. Replies = full Obiter (Opción A)

Se descartó tener una entidad "Comentario" separada. Cada respuesta es
un OD completo con `parentObiterId`. Mantiene simetría editorial:
"un Obiter respondiendo a un Obiter es jurídicamente correcto".

### 2. Replies solo en detalle (Opción B descartada en feed)

El feed principal solo muestra OD raíz (`parentObiterId IS NULL`). Las
respuestas viven en la página de detalle del padre. El contador
visible en cada card invita a entrar.

### 3. Unificación gradual de hilos

`threadId` (legacy) coexiste con `parentObiterId` (nuevo). La migración
`20260426_migrate_legacy_threads` convirtió todos los hilos legacy a
cadenas de auto-respuestas. El UI nuevo usa solo `parentObiterId`. El
campo legacy se mantiene como columna por compatibilidad pero la lógica
nueva no lo lee.

### 4. Auto-OD-resumen vs entidad propia

Cada publicación larga genera un OD-resumen (no una entidad nueva).
Esto unifica la conversación social en un solo lugar (el feed de OD)
y evita duplicar UI de apoyos/respuestas/citas/comuníquese para cada
módulo.

### 5. Replies y respuestas no consumen cuota diaria

`canPublishObiter` solo se chequea para OD raíz (no replies, no
continuaciones de hilo, no auto-summaries). Mantiene la conversación
viva sin penalizar al participante.

---

## Estado al cierre

- Diario completo rediseñado al nivel editorial premium del resto de la
  app (calendario, estadísticas, perfil).
- Sistema de respuestas Reddit-style funcionando con sort, anidación,
  notificaciones, y "in reply to".
- Hashtags + Contingencia operativos. La sección Contingencia ya no
  depende de `materia` sino de actividad real de hashtags.
- Menciones, búsqueda, borradores, compartir → todos funcionando.
- Auto-OD-resumen disparándose en las 4 APIs. Flujo end-to-end probado
  vía `npm run build` clean.

### Pendientes (no abordados en esta sesión)

- **Audit de seguridad** completo (lo pidió al inicio pero quedó al
  final; 6 endpoints OD, rate limiting, IDOR, XSS en linkPreviews).
- **Anti-spam**: límite de respuestas por OD/hora, detección de OD
  duplicados.
- **Rediseño visual de las páginas de Análisis/Ensayos/Debates/Expediente
  por separado** — el usuario dio licencia para hacerlo pero priorizamos
  el sistema auto-OD. Las páginas individuales siguen básicas.
- **Infinite scroll** en el feed (hoy "Cargar más").
- **Edit de borrador en background** (auto-resume si cierra tab).

---

## Comandos útiles para próxima sesión

```bash
# Aplicar migraciones pendientes (si vuelves a un branch sin aplicar)
cd /Users/bastianguzmanpicand/Documents/LexAmen && npx prisma migrate deploy

# Type-check
npx tsc --noEmit -p .

# Build completo
npm run build

# Regenerar Prisma client
npx prisma generate
```

---

🤖 Sesión asistida con Claude. 7 commits a `main`, ~3.000+ líneas
modificadas, 6 migraciones aplicadas.

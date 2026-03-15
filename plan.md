# Plan: Sistema de Colegas + Perfil Público

## Fase 1: Schema Prisma
- Agregar enum `ColegaStatus` (PENDING, ACCEPTED, REJECTED)
- Agregar model `ColegaRequest` con relaciones sender/receiver
- Agregar `COLEGA_REQUEST` y `COLEGA_ACCEPTED` al enum NotificationType
- Agregar relaciones `colegaRequestsSent` y `colegaRequestsReceived` a User
- Correr migración

## Fase 2: Helpers (`lib/colegas.ts`)
- `getColegaStatus(currentUserId, targetUserId)` → status + requestId
- `getColegas(userId)` → array de colegas con tier
- `getPendingRequests(userId)` → solicitudes recibidas pendientes
- `getSentRequests(userId)` → solicitudes enviadas pendientes
- `getPendingCount(userId)` → count para badge nav

## Fase 3: APIs (5 rutas)
- `POST /api/colegas/request` → enviar solicitud + notificación
- `POST /api/colegas/respond` → aceptar/rechazar + notificación
- `DELETE /api/colegas/[requestId]` → cancelar/eliminar
- `GET /api/colegas` → listar colegas + pendientes
- `GET /api/users/search?q=` → buscar usuarios con colegaStatus

## Fase 4: Perfil Público (`/dashboard/perfil/[userId]`)
- Server page con data fetching paralelo
- Client component con: header+avatar, stats, badges, colegas preview, ayudantías
- Botones de acción según colegaStatus
- Loading skeleton

## Fase 5: Página Colegas (`/dashboard/colegas`)
- Server page + client con 3 tabs
- Tab "Mis Colegas": buscador + lista con perfil/desafiar
- Tab "Solicitudes": aceptar/rechazar
- Tab "Enviadas": cancelar

## Fase 6: Navegación
- Reemplazar "La Sala" por "Colegas 👥" en MobileNav
- Badge de pendientes en nav
- Query pendingColegaCount en layout.tsx
- Agregar títulos en page-title.tsx

## Fase 7: Integración Causas
- Aceptar `opponentId` en `/api/causas/challenge`
- Query colegas en causas/page.tsx
- Sección "Desafiar a un Colega" en causas-hub.tsx

## Fase 8: Build + Commit + Push

### Archivos nuevos (12):
1. `lib/colegas.ts`
2. `app/api/colegas/request/route.ts`
3. `app/api/colegas/respond/route.ts`
4. `app/api/colegas/[requestId]/route.ts`
5. `app/api/colegas/route.ts`
6. `app/api/users/search/route.ts`
7. `app/dashboard/perfil/[userId]/page.tsx`
8. `app/dashboard/perfil/[userId]/perfil-client.tsx`
9. `app/dashboard/perfil/[userId]/loading.tsx`
10. `app/dashboard/colegas/page.tsx`
11. `app/dashboard/colegas/colegas-client.tsx`
12. `app/dashboard/colegas/loading.tsx`

### Archivos a modificar (8):
1. `prisma/schema.prisma`
2. `lib/notifications.ts`
3. `app/dashboard/components/mobile-nav.tsx`
4. `app/dashboard/layout.tsx`
5. `app/dashboard/components/page-title.tsx`
6. `app/api/causas/challenge/route.ts`
7. `app/dashboard/causas/page.tsx`
8. `app/dashboard/causas/causas-hub.tsx`

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reglas para agentes

- No agregues comentarios en el codigo.
- En pages dinamicas de App Router, `params` y `searchParams` se tratan como Promises y se resuelven con `await`.
- No edites `convex/_generated/` a mano.
- Mantén las validaciones criticas en Convex, no solo en la interfaz.
- Si cambias interfaz, revisa visualmente el flujo afectado.

## Producto

Padel Hardcancha / CanchaBGA Padel es una app web para clubes de padel.

Experiencias principales:

- Publico: directorio de clubes, pagina publica del club y reserva por fecha, hora, duracion y cancha.
- Jugador: autenticacion, creacion de reservas y consulta de `mis reservas`.
- Admin de club: agenda diaria, reservas manuales, bloqueos, pagos, cancelaciones, notas, membresias y configuracion.
- Super admin: creacion, edicion, publicacion y administracion de clubes/canchas.

## Stack

- Next.js 16.2.4 con App Router.
- React 19.2.4, TypeScript estricto.
- Tailwind CSS 4.
- Convex 1.36.1 como backend, base de datos en tiempo real y autenticacion.
- `@convex-dev/auth` para login.
- Vitest para pruebas.
- ESLint 9, Lucide React para iconos.

## Comandos

```bash
npm install
npm run dev          # Next.js en http://localhost:3000
npx convex dev       # Backend Convex (debe correr en paralelo con dev)
npm run typecheck
npm run lint
npm run test                                    # Todos los tests
npm run test -- tests/bookingRules.test.ts      # Un solo archivo
npm run test -- --reporter=verbose              # Output detallado
npm run build
npx convex run seed:seedDemoData --args '{"seedToken":"..."}'
```

El home redirige a `/clubes`.

## Entorno

```text
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CONVEX_SITE_URL=...
SEED_DEMO_TOKEN=...

# Mercado Pago OAuth (requerido para pagos online)
MERCADOPAGO_CLIENT_ID=...
MERCADOPAGO_CLIENT_SECRET=...
MERCADOPAGO_OAUTH_REDIRECT_URI=...          # e.g. https://app.com/api/auth/mercadopago/callback
MERCADOPAGO_TOKEN_ENCRYPTION_KEY=...        # base64 de 32 bytes: openssl rand -base64 32
MERCADOPAGO_WEBHOOK_SECRET=...
```

- Si falta `NEXT_PUBLIC_CONVEX_URL`, se usa el deployment demo `https://majestic-fennec-628.convex.cloud`.
- `MERCADOPAGO_TOKEN_ENCRYPTION_KEY` debe ser exactamente 32 bytes al decodificar en base64.

## Rutas principales

Publicas y jugador:

- `/clubes`: directorio de clubes publicados.
- `/club/[slug]`: pagina publica de un club.
- `/club/[slug]/reservar`: disponibilidad y seleccion de slot.
- `/club/[slug]/confirmar`: confirmacion de datos, eleccion de pago y creacion de reserva.
- `/club/[slug]/reserva/[code]`: comprobante de reserva.
- `/login`, `/registro`, `/logout`: autenticacion.
- `/mis-reservas`: reservas del usuario autenticado.

Admin de club: `/admin/agenda`, `/admin/membresias`, `/admin/config`.
Super admin: `/super-admin/login`, `/super-admin/clubes`, `/super-admin/clubes/nuevo`, `/super-admin/clubes/[clubId]/editar`.

## Arquitectura

```text
app/                    Rutas App Router y wrappers livianos.
components/player/      Flujo movil del jugador.
components/public/      Directorio y paginas publicas.
components/admin/       Panel del club.
components/super-admin/ Panel global de clubes.
components/auth/        Login, registro y logout.
convex/                 Backend, schema, auth, queries y mutations.
lib/                    Reglas puras, fechas, formato y helpers.
tests/                  Pruebas unitarias de reglas (18 archivos).
```

## Convex y datos

Tablas principales en `convex/schema.ts`:

- `users`, tablas de auth, `platformRoles`, `clubUsers`.
- `clubs`, `courts`, `customers`, `bookings`.
- `membershipPlans`, `customerMemberships`, `bookingSettlements`.
- `reservationPayments`, `mercadoPagoConnections`, `mercadoPagoOAuthStates`, `paymentWebhookEvents`.

Archivos clave:

- `convex/access.ts`: permisos y usuario actual.
- `convex/auth.ts`: configuracion de autenticacion.
- `convex/clubs.ts`: clubes, configuracion y super-admin.
- `convex/bookings.ts`: disponibilidad, reservas, agenda, pagos y bloqueos.
- `convex/memberships.ts`: planes y asignaciones.
- `convex/settlements.ts`: previsualizacion y cierre de liquidaciones.
- `convex/courts.ts` y `convex/validators.ts`: canchas y validadores compartidos.
- `convex/mercadoPagoOAuth.ts` y `convex/mercadoPagoClient.ts`: integracion de pagos online.

### Patron de queries/mutations en Convex

Estructura estandar:
1. Validar args con `v.*` validators.
2. `requireAuthUser(ctx)` para verificar sesion.
3. Fetch + check de acceso con `requireClubAccess(ctx, clubId, roles)`.
4. Logica de negocio (desde `lib/`).
5. Retorno tipado.

Errores: siempre lanzar `ConvexError` con objeto estructurado:
```ts
throw new ConvexError({ code: "INVALID_CLUB", message: "Club no encontrado" });
```

`action` para llamadas HTTP externas (Mercado Pago); `mutation` para escrituras; `query` para lecturas. Las variantes `internal*` son solo para uso interno entre funciones Convex.

## Pagos online con Mercado Pago

Las reservas publicas requieren pago online si el club tiene `onlinePaymentsEnabled=true`. El club conecta su cuenta MP via OAuth.

Flujo de reserva publica con pago:

1. `/confirmar` muestra opciones: **deposito** (25% online, resto en cancha) o **pago completo** (100% online).
2. `createOnlineBooking` crea la reserva con `paymentStatus="payment_pending"`.
3. `createReservationPayment` (action) crea preferencia de pago en MP y retorna `checkoutUrl`.
4. Usuario va a Mercado Pago; webhook actualiza el estado a `approved` o `rejected`.
5. Si el pago expira (`paymentExpiresAt`), la reserva queda cancelada.

Campos relevantes en `bookings`: `paymentStatus`, `paymentOptionSelected`, `paymentProvider`, `paymentCheckoutUrl`, `paymentExpiresAt`.

Archivos de reglas: `lib/reservationPaymentOptionRules.ts`, `lib/mercadoPagoFinancialRules.ts`, `lib/mercadoPagoAccessTokenRules.ts`.

Cambios de pagos: revisa tambien `convex/mercadoPagoOAuth.ts`, `convex/mercadoPagoClient.ts` y los tests en `tests/`.

## Reglas de negocio

Reservas (`lib/bookingRules.ts`):

- Zona horaria: `America/Bogota`.
- Duraciones validas: 60 o 120 minutos; slots de 60 minutos.
- Horarios en minutos desde medianoche.
- `confirmed` y `blocked` ocupan disponibilidad; `cancelled` no.
- Una reserva de 120 minutos requiere ambas horas libres.
- El precio se calcula por hora: fin de semana, normal o pico.

Clientes (`lib/customerRecords.ts`): el telefono se normaliza y las reservas online pueden asociarse a usuario y/o cliente.

Membresias (`lib/membershipRules.ts`):

- Beneficios: gratis, descuento porcentual o precio fijo.
- Pueden aplicar siempre o solo en dias/horarios definidos.
- Un cliente no debe tener membresias activas solapadas del mismo club.

Liquidaciones (`lib/settlementRules.ts`):

- MVP con 4 cupos por reserva.
- Calcula cobro por miembro, no miembro, descuento absorbido y ajuste manual.
- Se guardan snapshots de reglas para auditoria.

## Flujos importantes

Reserva publica:

1. `/reservar` consulta `api.bookings.getAvailability`.
2. `/confirmar` vuelve a validar disponibilidad y muestra opciones de pago.
3. `createOnlineBooking` valida en Convex club, cancha, horario, solapes y pasado.
4. Si hay pago, redirige a Mercado Pago; al volver lleva a `/reserva/[code]`.

Admin de club:

1. El acceso depende del usuario autenticado y `clubUsers`.
2. `getCurrentUserClubForAdmin` define el club operativo.
3. La agenda usa `listAgendaByDate`.
4. Desde agenda se crean reservas manuales, bloqueos, pagos, cancelaciones, notas y liquidaciones.

Super admin:

1. Requiere rol activo en `platformRoles`.
2. Puede crear, editar, publicar, despublicar y desactivar clubes.
3. Puede administrar canchas y asignar responsable del club.

## Estilo visual

- Estetica de club deportivo: verde cancha, tinta, blanco y estados claros.
- Usa tokens y clases de `app/globals.css`: `btn`, `btn-primary`, `btn-ghost`, `btn-icon`, `field`, `pill`.
- Paleta: `--court-*` (verde), `--clay-*` (arcilla), `--ink-*` (texto), `--status-*` (estados).
- Usa `lucide-react` para iconos.
- Evita estilos globales nuevos si Tailwind local alcanza.
- En desktop, la experiencia del jugador puede simular telefono; en movil debe ocupar pantalla completa.

## Al cambiar codigo

- Cambios de reservas: revisa `lib/bookingRules.ts`, `convex/bookings.ts` y `tests/bookingRules.test.ts`.
- Cambios de pagos online: revisa `lib/reservationPaymentOptionRules.ts`, `convex/mercadoPagoClient.ts` y tests de mercadoPago.
- Cambios de membresias: revisa `lib/membershipRules.ts`, `convex/memberships.ts` y `tests/membershipRules.test.ts`.
- Cambios de liquidaciones: revisa `lib/settlementRules.ts`, `convex/settlements.ts` y `tests/settlementRules.test.ts`.
- Cambios de auth/permisos: revisa `convex/access.ts`, `convex/users.ts`, `lib/authRouting.ts` y `components/auth/`.
- Cambios de UI: levanta la app y revisa la ruta afectada.
- Despues de tocar Convex, corre `npx convex dev` si necesitas regenerar tipos.

## Validacion antes de reportar

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Problemas comunes

- Sin datos demo: `npx convex run seed:seedDemoData --args '{"seedToken":"..."}'`.
- App sin conexion: revisar `.env.local` y `npx convex dev`.
- Tipos de Convex desactualizados: correr `npx convex dev`.
- Error en rutas dinamicas: revisar `params` y `searchParams` como Promises.
- UI muestra disponible pero guardar falla: confiar en Convex; probablemente hubo solape, slot pasado o cambio de disponibilidad.
- Pago online falla: verificar que `MERCADOPAGO_TOKEN_ENCRYPTION_KEY` este configurado y el club tenga conexion activa en `mercadoPagoConnections`.

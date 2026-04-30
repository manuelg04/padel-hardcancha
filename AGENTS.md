# AGENTS.md

Guia para LLMs y devs nuevos que trabajen en este proyecto.

## Resumen del producto

Padel Hardcancha / CanchaBGA Padel es un prototipo web para reservas de canchas de padel. Tiene dos experiencias:

- Jugador: landing del club, seleccion de fecha/hora, confirmacion de datos y pantalla de reserva confirmada.
- Administrador: login demo, agenda diaria, creacion manual de reservas, bloqueos, pagos, cancelaciones y configuracion del club/canchas.

El club demo principal es `match-point`.

## Stack

- Next.js `16.2.4` con App Router.
- React `19.2.4`.
- TypeScript estricto.
- Tailwind CSS `4` mediante `@tailwindcss/postcss`.
- Convex como backend/base de datos en tiempo real.
- Vitest para pruebas unitarias.
- ESLint 9 con reglas de Next core web vitals y TypeScript.
- Iconos con `lucide-react`.

## Regla importante sobre Next.js

Este proyecto usa una version reciente de Next.js con cambios que pueden diferir de conocimiento previo del modelo.

Antes de modificar codigo de Next, leer la guia relevante en:

```text
node_modules/next/dist/docs/
```

Ejemplos utiles:

- Rutas, layouts y pages: `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- Server y Client Components: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Navegacion: `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- Mutaciones/datos: `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`

En este proyecto, los `params` y `searchParams` de las pages dinamicas se usan como Promises y se resuelven con `await`.

## Comandos

Instalar dependencias:

```bash
npm install
```

Levantar el frontend:

```bash
npm run dev
```

Abrir:

```text
http://localhost:3000
```

El home redirige a:

```text
/club/match-point
```

Levantar Convex en desarrollo:

```bash
npx convex dev
```

Sembrar datos demo:

```bash
npx convex run seed:seedDemoData
```

Validaciones antes de reportar cambios:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Para cambios solo de documentacion, al menos confirmar que el archivo existe y que el contenido quedo completo. Si el cambio toca interfaz, levantar el proyecto y revisar visualmente los flujos afectados.

## Variables de entorno

El proyecto usa `.env.local`.

Variables esperadas:

```text
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CONVEX_SITE_URL=...
```

Notas:

- `NEXT_PUBLIC_CONVEX_URL` es usada por `app/providers.tsx`.
- Si no existe `NEXT_PUBLIC_CONVEX_URL`, el cliente cae al deployment demo `https://majestic-fennec-628.convex.cloud`.
- No publiques secretos ni tokens. Las variables `NEXT_PUBLIC_*` son visibles para el navegador.

## Rutas principales

Publicas para jugadores:

- `/` redirige a `/club/match-point`.
- `/club/[slug]` muestra la pagina publica del club.
- `/club/[slug]/reservar` muestra disponibilidad por fecha, duracion y cancha.
- `/club/[slug]/confirmar` recibe datos por query string y confirma la reserva.
- `/club/[slug]/reserva/[code]` muestra el comprobante de reserva.

Admin:

- `/admin/login` usa credenciales demo locales.
- `/admin/agenda` muestra la agenda diaria y operaciones de reservas.
- `/admin/config` permite editar datos del club, precios, horarios y canchas.

Credenciales demo:

```text
email: recepcion@matchpointpadel.co
password: demo1234
```

El login demo vive en `localStorage`. No es autenticacion real ni debe tratarse como seguridad de produccion.

## Arquitectura de carpetas

```text
app/
  layout.tsx              Layout raiz, fuentes y proveedor de Convex.
  providers.tsx           ConvexProvider del lado cliente.
  page.tsx                Redireccion al club demo.
  globals.css             Tokens visuales, utilidades globales y estilos base.
  club/[slug]/...         Rutas publicas del jugador.
  admin/...               Rutas del panel administrativo.

components/
  player/                 Experiencia movil del jugador.
  admin/                  Panel administrativo y componentes de operacion.

convex/
  schema.ts               Tablas clubs, courts y bookings.
  validators.ts           Validadores compartidos de Convex.
  clubs.ts                Consultas/mutaciones del club.
  courts.ts               Consultas/mutaciones de canchas.
  bookings.ts             Disponibilidad, reservas, agenda, pagos y bloqueos.
  seed.ts                 Datos demo de Match Point Padel.
  _generated/             Archivos generados por Convex. No editarlos a mano.

lib/
  bookingRules.ts         Reglas puras de disponibilidad, precios y horarios.
  dates.ts                Fechas locales, formato y conversion hora/minutos.
  demoSession.ts          Login demo con localStorage.
  format.ts               Formato COP, telefonos e iniciales.
  whatsapp.ts             URLs y mensajes de WhatsApp.

tests/
  bookingRules.test.ts    Pruebas de precios, disponibilidad y fechas.
```

## Modelo de datos

`clubs`

- Identifica el club por `slug`.
- Guarda ciudad, direccion, WhatsApp, zona horaria, descripcion, horarios, precios y estado activo.
- Tiene indice `by_slug`.

`courts`

- Pertenece a un club.
- Guarda nombre, descripcion, tipo de cancha, si es techada, orden y estado activo.
- Tiene indice `by_club`.

`bookings`

- Representa reservas y bloqueos.
- Campos clave: club, cancha, codigo, fecha local, inicio/fin en minutos, duracion, cliente, origen, pago, estado y valor.
- Estados de reserva: `confirmed`, `cancelled`, `blocked`.
- Estados de pago: `pending`, `paid`.
- Origenes: `online`, `manual`, `whatsapp`, `walk_in`.
- Indices: `by_club_date`, `by_court_date`, `by_code`, `by_club_status`.

## Reglas de reservas

Las reglas centrales estan en `lib/bookingRules.ts`.

- Zona horaria principal: `America/Bogota`.
- Duracion valida: 60 o 120 minutos.
- Los horarios se manejan como minutos desde medianoche.
- El tamano de slot es de 60 minutos.
- Reservas `confirmed` y bloqueos `blocked` ocupan disponibilidad.
- Reservas `cancelled` no bloquean disponibilidad.
- Una reserva de 2 horas requiere que ambas horas consecutivas esten libres.
- Los precios se calculan por hora:
  - Fin de semana usa precio de fin de semana para todas las horas.
  - Entre semana usa precio normal o pico segun hora de inicio de cada tramo.

## Flujo del jugador

1. `/club/[slug]` consulta `api.clubs.getClubBySlug`.
2. El jugador entra a `/reservar`.
3. `ReserveClient` consulta `api.bookings.getAvailability` con club, fecha y duracion.
4. Al elegir un slot disponible, navega a `/confirmar` con `courtId`, `date`, `startMinutes` y `durationMinutes`.
5. `ConfirmClient` vuelve a consultar disponibilidad para validar el slot visible.
6. Al enviar el formulario, ejecuta `api.bookings.createOnlineBooking`.
7. Convex valida club, cancha, horario y solapes antes de insertar.
8. El jugador llega a `/reserva/[code]`, donde puede compartir por WhatsApp.

## Flujo admin

1. `/admin/login` valida credenciales demo en `lib/demoSession.ts`.
2. `AdminLayout` protege visualmente las rutas revisando la sesion demo en `localStorage`.
3. `/admin/agenda` consulta `api.bookings.listAgendaByDate`.
4. La agenda muestra metricas, filtros, busqueda y grilla por cancha/hora.
5. Desde la agenda se pueden crear reservas manuales, bloquear horarios, marcar pagos, cancelar y editar notas.
6. `/admin/config` permite editar club, horarios, precios y canchas.

## Convex

Despues de cambiar archivos en `convex/`, regenerar tipos si hace falta:

```bash
npx convex dev
```

No edites manualmente `convex/_generated/` salvo que sepas exactamente por que. Normalmente los genera Convex.

Cada query/mutation declara `args` y `returns`; conserva ese patron.

Al cambiar reglas de reservas, revisa tanto:

- `lib/bookingRules.ts`
- `convex/bookings.ts`
- `tests/bookingRules.test.ts`

## Estilo visual y UX

- La experiencia de jugador simula un telefono en desktop y pantalla completa en movil.
- Los tokens globales viven en `app/globals.css`.
- Usa clases existentes como `btn`, `btn-primary`, `btn-ghost`, `btn-icon`, `field`, `pill`.
- Mantener la estetica de club deportivo: verde cancha, tinta, papel blanco, estados claros para disponible/pendiente/pagado/bloqueado.
- Para iconos, usar `lucide-react`.
- Evitar meter estilos globales innecesarios si una clase local de Tailwind alcanza.

## Consideraciones importantes

- El slug `match-point` esta hardcodeado en varias partes del admin. Si se multi-clubiza, revisar esas dependencias.
- El login admin es solo demo. No agregar funciones sensibles asumiendo seguridad real.
- El cliente de Convex se crea en `app/providers.tsx`, por eso las pantallas que usan `useQuery` o `useMutation` son Client Components.
- Las pages de `app/` suelen ser wrappers livianos; la logica interactiva vive en `components/`.
- Fechas visibles deben tratarse como fechas locales de Bogota y evitar desplazamientos por UTC.
- Valores monetarios se muestran con `formatCOP`.
- Telefonos/WhatsApp se normalizan en `lib/whatsapp.ts` y `lib/format.ts`.
- Validaciones criticas de reservas deben estar en Convex, no solo en UI.

## Pruebas actuales

Las pruebas cubren:

- Calculo de precios normal, pico y fin de semana.
- Deteccion de solapes.
- Disponibilidad con reservas confirmadas, bloqueos y canceladas.
- Fechas locales sin corrimiento de dia.

Ejecutar:

```bash
npm run test
```

## Criterio de terminado para cambios

Antes de decir que algo esta listo:

1. Identificar que flujo o regla se toco.
2. Ejecutar la validacion mas cercana: test, typecheck, lint, build o revision visual.
3. Si se cambio UI, abrir la pagina afectada y comprobar que carga y que el flujo principal funciona.
4. Si se cambio Convex o reglas de reservas, probar casos de solape, cancelacion, bloqueo y duracion cuando aplique.
5. Reportar en lenguaje claro que se cambio y que verificacion paso.

## Problemas comunes

- Si no hay datos, correr `npx convex run seed:seedDemoData`.
- Si la app no conecta a Convex, revisar `.env.local` y que `npx convex dev` este activo.
- Si TypeScript no reconoce funciones de Convex, regenerar tipos con `npx convex dev`.
- Si una ruta dinamica falla por params, recordar que en esta version se usan como Promise en las pages.
- Si una reserva parece disponible en UI pero falla al guardar, confiar en la validacion de Convex: probablemente hubo solape o cambio de disponibilidad.

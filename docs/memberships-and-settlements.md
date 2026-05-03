# Membresias y liquidacion de reservas

## A. Resumen de la feature

Esta feature permite que un club cree planes de membresia, asigne esos planes a clientes y use esos beneficios al cerrar el cobro de una reserva desde administracion/recepcion.

El MVP resuelve el calculo final de cobro cuando jugaron miembros y no miembros en una cancha. La reserva sigue siendo simple para el jugador: una sola persona reserva, la cancha conserva su valor total y recepcion decide al final que miembros participaron.

Este MVP no resuelve registro completo de participantes, pagos por persona, pasarela de pagos, beneficios para invitados, horas incluidas, cupos mensuales ni reglas complejas por tramos de horario.

## B. Reglas de negocio

- La reserva publica tiene un solo reservante.
- El flujo publico no pide 4 jugadores.
- No existen participantes obligatorios para una reserva en este MVP.
- `bookings.value` es el valor total de la cancha.
- La liquidacion ocurre al final del partido desde admin/recepcion.
- La cancha se divide entre 4 cupos base.
- Recepcion selecciona solo los miembros que jugaron.
- Los no miembros se calculan automaticamente como los cupos restantes.
- Cada miembro seleccionado ocupa un cupo.
- La membresia aplica por jugador miembro seleccionado en liquidacion.
- Los no miembros pagan su parte normal.
- Los no miembros no pagan mas para cubrir descuentos de miembros.
- El club absorbe descuentos, gratuidades y diferencias por redondeo.
- Una liquidacion pagada no se puede editar.
- No hay pasarela de pagos.
- No hay pagos parciales por persona.
- No hay descuentos grupales.
- No hay invitados beneficiados por membresia.
- No hay cupos mensuales ni horas incluidas en este MVP.

## C. Ejemplos de calculo

| Ejemplo | Caso | Calculo | Resultado |
| --- | --- | --- | --- |
| 1 | Cancha $120.000, sin miembros | 4 no miembros x $30.000 | Total cobrado $120.000, descuento absorbido $0 |
| 2 | Cancha $120.000, 1 miembro gratis, 3 no miembros | Miembro $0 + 3 x $30.000 | Total cobrado $90.000, descuento absorbido $30.000 |
| 3 | Cancha $120.000, 2 miembros gratis, 2 no miembros | 2 miembros $0 + 2 x $30.000 | Total cobrado $60.000, descuento absorbido $60.000 |
| 4 | Cancha $120.000, 1 miembro con 30% descuento | Miembro paga $21.000 + 3 no miembros pagan $90.000 | Total cobrado $111.000, descuento absorbido $9.000 |
| 5 | Cancha $120.000, 1 miembro con precio fijo $15.000 | Miembro paga $15.000 + 3 no miembros pagan $90.000 | Total cobrado $105.000, descuento absorbido $15.000 |

En todos los ejemplos la base por jugador es $30.000, porque $120.000 se divide entre 4 cupos.

## D. Modelos y tablas principales

### `bookings`

Representa reservas y bloqueos de cancha.

Campos importantes:

- `clubId` y `courtId`: vinculan la reserva al club y a la cancha.
- `customerId`, `customerName`, `customerPhone`, `customerEmail`: datos del reservante.
- `localDate`, `startMinutes`, `endMinutes`, `durationMinutes`: fecha y horario local.
- `bookingStatus`: indica si esta confirmada, cancelada o bloqueada.
- `paymentStatus`: indica si el pago de la reserva esta pendiente o pagado.
- `value`: valor total de la cancha.

No modificar sin cuidado:

- No cambiar el significado de `value`.
- No convertir la reserva publica en un registro obligatorio de 4 participantes dentro de `bookings`.
- No confiar en cambios de UI para reglas criticas; las validaciones importantes deben seguir en Convex.

### `membershipPlans`

Define los planes que un club puede ofrecer a sus clientes.

Campos importantes:

- `clubId`: club dueno del plan.
- `name` y `description`: informacion visible para administracion.
- `benefitType`: tipo de beneficio: gratis, porcentaje de descuento o precio fijo.
- `discountPercent`: porcentaje cuando el beneficio es descuento.
- `fixedPrice`: valor fijo cuando el beneficio es precio fijo.
- `appliesAlways`, `validDaysOfWeek`, `validStartTime`, `validEndTime`: reglas de aplicacion por horario.
- `isActive`: controla si el plan puede usarse o asignarse.

No modificar sin cuidado:

- No permitir usar planes inactivos en nuevas liquidaciones.
- No mezclar planes entre clubes.
- No agregar horas incluidas o cupos mensuales dentro de este MVP sin una fase aparte.

### `customerMemberships`

Representa la membresia de un customer en un club.

Campos importantes:

- `clubId`: club al que pertenece la membresia.
- `customerId`: customer miembro.
- `membershipPlanId`: plan asignado.
- `status`: activa, pausada, cancelada o expirada.
- `startsAt` y `endsAt`: vigencia.
- `userId`: enlace opcional con usuario autenticado.

No modificar sin cuidado:

- No permitir membresias activas duplicadas y solapadas para el mismo customer en el mismo club.
- No aceptar customers o planes de otro club.
- No tratar una membresia pausada, cancelada o expirada como beneficio aplicable.

### `bookingSettlements`

Guarda el resultado de liquidar una reserva.

Campos importantes:

- `bookingId`, `clubId`, `courtId`: reserva, club y cancha liquidados.
- `status`: borrador, cerrada, pagada o cancelada.
- `baseBookingValue`: copia del valor cancha usado para calcular.
- `baseShareValue`: valor base por jugador.
- `playerSlots`: numero de cupos base; en este MVP siempre 4.
- `memberCharges`: detalle de miembros seleccionados y su cobro.
- `nonMemberCount`, `nonMemberUnitValue`, `nonMemberTotalValue`: no miembros calculados automaticamente.
- `finalTotalCollectedValue`: dinero real a cobrar despues de beneficios y ajustes permitidos.
- `discountAbsorbedByClubValue`: descuento o gratuidad asumida por el club.
- `paidAt` y `closedAt`: fechas de cierre y pago.

No modificar sin cuidado:

- No editar una liquidacion pagada.
- No permitir sobrecargos para cubrir descuentos de miembros.
- No cambiar el numero de cupos base sin revisar todas las reglas y pruebas.

## E. `bookings.value`

`bookings.value` no es necesariamente el dinero real cobrado.

`bookings.value` es el valor total de la cancha segun la reserva. Debe mantenerse como referencia estable para agenda, precios, disponibilidad y reportes de valor cancha.

Cuando existe liquidacion, el dinero real cobrado sale de `bookingSettlements.finalTotalCollectedValue`.

No se debe cambiar el significado de `bookings.value`. Si se necesita saber cuanto se cobro realmente, se debe consultar la liquidacion.

## F. Flujo operativo

1. Usuario reserva una cancha.
2. La reserva queda a nombre de una sola persona.
3. Al final del partido, recepcion abre la reserva en agenda/admin.
4. Recepcion selecciona los miembros que jugaron.
5. El sistema calcula los no miembros automaticamente.
6. El sistema calcula el total a cobrar y el descuento absorbido por el club.
7. Recepcion guarda la liquidacion.
8. Recepcion marca la liquidacion como pagada.

## G. Permisos

`club_master` puede:

- Ver planes y membresias del club.
- Crear y editar planes de membresia.
- Activar o desactivar planes.
- Asignar, pausar y cancelar membresias de customers del club.
- Crear, actualizar y pagar liquidaciones de reservas del club.

`club_staff` puede:

- Ver informacion necesaria para operar el club.
- Buscar miembros vigentes del club para liquidar reservas.
- Crear, actualizar y pagar liquidaciones de reservas del club.

`club_staff` no debe:

- Crear o editar planes de membresia.
- Asignar, pausar o cancelar membresias.

Un usuario normal no puede:

- Crear planes.
- Asignar membresias.
- Liquidar reservas.
- Usar customers, planes o reservas de un club al que no pertenece.

Validaciones cross-club:

- Un customer seleccionado para liquidacion debe pertenecer al mismo club de la reserva.
- Un plan usado por una membresia debe pertenecer al mismo club.
- Una membresia asignada debe cruzar customer, plan y club correctamente.
- Los accesos de admin se validan por club antes de operar.

## H. Limitaciones del MVP

Todavia no existe:

- Registro de los 4 jugadores.
- Pago parcial por persona.
- Pasarela de pagos.
- Beneficios para invitados.
- Descuentos grupales.
- Horas incluidas.
- Cupos mensuales.
- Reglas partidas por tramos horarios.
- Arnes completo de tests de integracion Convex para roles y validaciones cross-club.

## I. Riesgos conocidos

- Las reglas de horario de membresia se evaluan con la hora de inicio de la reserva.
- No hay todavia un arnes completo de integracion Convex para roles y cross-club.
- Si luego se requieren participantes reales, debe manejarse como otra fase y no como ajuste menor de este MVP.

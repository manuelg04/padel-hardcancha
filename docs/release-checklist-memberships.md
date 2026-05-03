# Checklist de release: membresias y liquidacion

Usar este checklist antes de subir la feature a staging o produccion.

## A. Comandos

Ejecutar en este orden:

- `npx convex codegen`
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`

El release no debe continuar si alguno falla, salvo que el equipo decida documentar el fallo como riesgo aceptado.

## B. Smoke test publico

- Entrar a `/clubes`.
- Entrar a un club publicado.
- Reservar una cancha.
- Confirmar que solo pide datos del reservante.
- Confirmar que no pide 4 jugadores.
- Confirmar que la reserva queda creada.

## C. Smoke test admin/membresias

- Entrar al panel admin con un usuario del club.
- Abrir la seccion de membresias.
- Crear un plan gratis.
- Crear un plan con porcentaje.
- Crear un plan con precio fijo.
- Asignar membresia a un customer.
- Intentar duplicar una membresia activa del mismo customer y confirmar que falla.
- Pausar una membresia.
- Cancelar una membresia.
- Confirmar que `club_staff` no puede crear planes ni asignar membresias.

## D. Smoke test liquidacion

- Abrir una reserva confirmada desde agenda/admin.
- Liquidar reserva sin miembros.
- Liquidar reserva con 1 miembro gratis.
- Liquidar reserva con 2 miembros gratis.
- Liquidar reserva con miembro con descuento.
- Liquidar reserva con miembro fuera de horario aplicable.
- Guardar liquidacion.
- Marcar liquidacion pagada.
- Confirmar que liquidacion pagada no se puede editar.
- Confirmar que reservas canceladas y bloqueos no se liquidan.

## E. Smoke test permisos

- Staff de club A no puede usar customer de club B.
- Staff de club A no puede usar plan de club B.
- Usuario normal no puede liquidar.
- Usuario normal no puede crear planes.
- Usuario sin acceso al club no puede ver ni operar liquidaciones de ese club.

## F. Validacion de totales

- Verificar que agenda distingue "Valor cancha" y "Cobrado real".
- Verificar que `bookings.value` no cambia al liquidar.
- Verificar que el total cobrado viene de la liquidacion cuando existe.
- Verificar que los no miembros pagan su cupo base normal.
- Verificar que los descuentos de miembros no se reparten entre no miembros.
- Verificar que el descuento absorbido queda a cargo del club.

## G. Datos temporales

- Revisar que no existan customers, usuarios, reservas, planes, membresias o liquidaciones de prueba con nombres como "Codex", "QA" o similares en staging/produccion.
- Si se detectan datos temporales, eliminarlos solo si el entorno y los registros son claramente de prueba.
- No borrar datos reales ni ejecutar migraciones destructivas para esta limpieza.

## H. Criterio de listo

La feature queda lista para release cuando:

- Todos los comandos pasan.
- El flujo publico mantiene un solo reservante.
- Admin puede crear y gestionar planes segun permisos.
- Recepcion puede liquidar seleccionando solo miembros.
- Los no miembros se calculan automaticamente.
- `bookings.value` conserva el valor total de la cancha.
- La liquidacion pagada queda bloqueada para edicion.
- Los riesgos conocidos estan documentados.

export function Features() {
  return (
    <section className="section-paper" id="producto">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-index">[ 01 · Producto ]</div>
          <h2 className="section-title">
            Todo lo que tu club necesita,
            <br />
            <span className="accent">organizado por prioridad.</span>
          </h2>
        </div>
        <div className="section-rule" />

        <div className="features-grid">
          <div className="feature dark span-7 reveal">
            <div className="feature-num">01 · AGENDA</div>
            <div className="feature-title">
              Agenda diaria que se entiende de un vistazo.
            </div>
            <p className="feature-desc">
              Visualiza reservas, bloqueos, pagos y disponibilidad del día sin
              depender de mensajes dispersos. Una sola pantalla para toda la
              operación.
            </p>
            <div className="feature-visual fv-agenda">
              <div className="fv-row">
                <span className="fv-time mono">08:00</span>
                <span className="fv-pill">Disponible</span>
              </div>
              <div className="fv-row">
                <span className="fv-time mono">10:00</span>
                <span className="fv-pill live">Andrés &amp; Juan · Cancha 1</span>
              </div>
              <div className="fv-row">
                <span className="fv-time mono">12:00</span>
                <span className="fv-pill warm">Mantenimiento</span>
              </div>
              <div className="fv-row">
                <span className="fv-time mono">16:00</span>
                <span className="fv-pill live">Laura &amp; Sofía · Cancha 2</span>
              </div>
            </div>
          </div>

          <div className="feature green span-5 reveal">
            <div className="feature-num">02 · RESERVAS</div>
            <div className="feature-title">
              Reservas en línea, listas para vender.
            </div>
            <p className="feature-desc">
              Tus jugadores eligen fecha, hora y cancha en minutos. Desde
              cualquier dispositivo, sin fricción.
            </p>
            <div className="feature-visual">
              <div className="fv-block">
                <span className="fv-tile open">8:00</span>
                <span className="fv-tile open">10:00</span>
                <span className="fv-tile locked">12:00</span>
                <span className="fv-tile open">16:00</span>
                <span className="fv-tile open">18:00</span>
                <span className="fv-tile open">20:00</span>
              </div>
            </div>
          </div>

          <div className="feature light span-4 reveal">
            <div className="feature-num">03 · PAGOS</div>
            <div className="feature-title">Pagos y notas por reserva.</div>
            <p className="feature-desc">
              Registra pagos, observaciones y seguimiento de cada cliente.
            </p>
            <div className="feature-visual fv-pay">
              <div className="fv-pay-row">
                <span>Andrés M.</span>
                <span className="fv-pay-amount">$60.000</span>
              </div>
              <div className="fv-pay-row">
                <span>Laura T.</span>
                <span className="fv-pay-amount">$80.000</span>
              </div>
              <div className="fv-pay-row">
                <span>Carlos R.</span>
                <span className="fv-pay-amount">$60.000</span>
              </div>
            </div>
          </div>

          <div className="feature dark span-4 reveal">
            <div className="feature-num">04 · BLOQUEOS</div>
            <div className="feature-title">
              Bloqueo de horarios cuando lo necesites.
            </div>
            <p className="feature-desc">
              Cierra canchas por mantenimiento, eventos o disponibilidad
              interna.
            </p>
            <div className="feature-visual">
              <div className="fv-block">
                <span className="fv-tile muted">06:00</span>
                <span className="fv-tile locked">08:00 · Mant.</span>
                <span className="fv-tile locked">09:00 · Mant.</span>
                <span className="fv-tile muted">10:00</span>
              </div>
            </div>
          </div>

          <div className="feature light span-4 reveal">
            <div className="feature-num">05 · MEMBRESÍAS</div>
            <div className="feature-title">Planes y miembros, ordenados.</div>
            <p className="feature-desc">
              Administra planes, beneficios y clientes recurrentes.
            </p>
            <div className="feature-visual fv-members">
              <div className="fv-member-card">
                <div className="fv-avatar">AM</div>
                <div className="fv-member-info">
                  <span className="fv-member-name">Andrés Martínez</span>
                  <span className="fv-member-tier">Plan Pro · 12 meses</span>
                </div>
                <span className="fv-member-status">Activo</span>
              </div>
              <div className="fv-member-card">
                <div className="fv-avatar">LT</div>
                <div className="fv-member-info">
                  <span className="fv-member-name">Laura Torres</span>
                  <span className="fv-member-tier">Plan Plus · 6 meses</span>
                </div>
                <span className="fv-member-status">Activo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

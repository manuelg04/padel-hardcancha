"use client";

import { useEffect, useState } from "react";
import {
  ArrowIcon,
  CalendarIcon,
  CardIcon,
  CheckIcon,
  ClockIcon,
  LockIcon,
  MapIcon,
  UsersIcon,
} from "./Icons";

type View = "admin" | "player";

export function Hero({ ctaHref }: { ctaHref: string }) {
  const [view, setView] = useState<View>("admin");

  return (
    <section className="hero" id="inicio">
      <div className="hero-grid-bg" />
      <div className="hero-glow" />
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="dot" />
            <span>Sistema operativo · clubes de pádel</span>
          </div>
          <h1>
            Tu club, en <span className="accent">tiempo real</span>.
            <br />
            Cada cancha, cada reserva.
          </h1>
          <p className="hero-sub">
            CanchaLista convierte el día a día de tu club en una sola pantalla:
            agenda viva, reservas en línea, pagos y bloqueos. Sin fricción, sin
            WhatsApp interminable.
          </p>
          <div className="hero-actions">
            <a href={ctaHref} className="btn btn-primary">
              Solicitar demo <ArrowIcon />
            </a>
            <a href="#producto" className="btn btn-ghost">
              Ver el producto <ArrowIcon />
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">
                28<span style={{ color: "var(--cl-green-400)" }}>/día</span>
              </div>
              <div className="hero-stat-label">Reservas promedio</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">3 min</div>
              <div className="hero-stat-label">Para reservar</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">100%</div>
              <div className="hero-stat-label">Web · sin instalar</div>
            </div>
          </div>
        </div>

        <div className="hero-product">
          <div className="product-toggle" role="tablist" aria-label="Vista del producto">
            <button
              type="button"
              role="tab"
              aria-selected={view === "admin"}
              className={view === "admin" ? "active" : ""}
              onClick={() => setView("admin")}
            >
              Vista club
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "player"}
              className={view === "player" ? "active" : ""}
              onClick={() => setView("player")}
            >
              Vista jugador
            </button>
          </div>

          <div className="product-window">
            <div className="product-chrome">
              <div className="dots">
                <span />
                <span />
                <span />
              </div>
              <div className="url mono">
                {view === "admin"
                  ? "app.canchalista.co/agenda"
                  : "canchalista.co/club-bucaramanga"}
              </div>
              <div style={{ width: 30 }} />
            </div>
            <div className="product-body" key={view}>
              <div className="product-fade">
                {view === "admin" ? <AdminView /> : <PlayerView />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminView() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 2200);
    return () => clearInterval(id);
  }, []);

  const courts: { name: string; slots: string[] }[] = [
    { name: "Cancha 1", slots: ["booked", "booked", "", "booked", "booked", "booked", "live", ""] },
    {
      name: "Cancha 2",
      slots: ["", "booked-warm", "booked", "", "maint", "maint", "booked", "booked"],
    },
    {
      name: "Cancha 3",
      slots: ["booked", "", "booked-amber", "booked", "booked", "", "booked", "booked"],
    },
    { name: "Cancha 4", slots: ["", "", "booked", "booked", "booked", "booked", "", ""] },
  ];

  const navItems = [
    { label: "Agenda", icon: <CalendarIcon size={16} />, active: true },
    { label: "Reservas", icon: <ClockIcon size={16} /> },
    { label: "Pagos", icon: <CardIcon size={16} /> },
    { label: "Bloqueos", icon: <LockIcon size={16} /> },
    { label: "Membresías", icon: <UsersIcon size={16} /> },
    { label: "Canchas", icon: <MapIcon size={16} /> },
  ];

  return (
    <div className="admin-view">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">CanchaLista</div>
        {navItems.map((item) => (
          <span
            key={item.label}
            className={`admin-nav-item ${item.active ? "active" : ""}`}
          >
            {item.icon} {item.label}
          </span>
        ))}
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <div>
            <div className="admin-date-label mono">Mié · 06 may</div>
            <h3>Agenda de hoy</h3>
          </div>
          <span className="live mono">EN VIVO</span>
        </div>

        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-label">Reservas</div>
            <div className="kpi-value">24</div>
            <div className="kpi-delta">+12% vs. ayer</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Ocupación</div>
            <div className="kpi-value">78%</div>
            <div className="kpi-delta">+5%</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Ingresos</div>
            <div className="kpi-value mono">$1.2M</div>
            <div className="kpi-delta">+18%</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Jugadores</div>
            <div className="kpi-value">86</div>
            <div className="kpi-delta">+8 nuevos</div>
          </div>
        </div>

        <div className="timeline">
          <div className="timeline-head">
            <div className="timeline-title">Ocupación · 4 canchas</div>
            <div className="timeline-range mono">08:00 — 22:00</div>
          </div>
          <div className="timeline-courts">
            {courts.map((court, ci) => (
              <div className="timeline-row" key={court.name}>
                <div className="timeline-court-label">{court.name}</div>
                <div className="timeline-slots">
                  {court.slots.map((s, i) => {
                    const classes = ["timeline-slot"];
                    if (s === "booked") classes.push("booked");
                    if (s === "booked-warm") classes.push("booked", "warm");
                    if (s === "booked-amber") classes.push("booked", "amber");
                    if (s === "maint") classes.push("maint");
                    if (s === "live") {
                      classes.push("live");
                      if (ci === 0 && i === 6 && tick >= 2) classes.push("booked");
                    }
                    return <div key={i} className={classes.join(" ")} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

type Court = { id: number; name: string; meta: string };

function PlayerView() {
  const [step, setStep] = useState(0);
  const [court, setCourt] = useState<Court | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const courts: Court[] = [
    { id: 1, name: "Cancha Central", meta: "Cubierta · cristal" },
    { id: 2, name: "Cancha 2", meta: "Aire libre" },
    { id: 3, name: "Cancha 3", meta: "Cubierta · cristal" },
  ];
  const times = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "21:00"];
  const taken = ["12:00", "20:00"];

  const reset = () => {
    setStep(0);
    setCourt(null);
    setTime(null);
  };

  const endHour = time ? `${String(parseInt(time, 10) + 1).padStart(2, "0")}:30` : "";

  return (
    <div className="player-view">
      <div className="player-header">
        <h3>Reservar cancha</h3>
        <span className="step-counter">Paso {Math.min(step + 1, 3)} / 3</span>
      </div>

      {step === 0 && (
        <>
          <div className="player-step-label">01 · Elige tu cancha</div>
          <div className="court-grid">
            {courts.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`court-card ${court?.id === c.id ? "selected" : ""}`}
                onClick={() => {
                  setCourt(c);
                  setTimeout(() => setStep(1), 220);
                }}
              >
                <div className="court-card-img" />
                <div className="court-card-name">{c.name}</div>
                <div className="court-card-meta">{c.meta}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="player-step-label">02 · Elige el horario · {court?.name}</div>
          <div className="time-grid">
            {times.map((t) => {
              const isTaken = taken.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`time-slot ${time === t ? "selected" : ""}`}
                  disabled={isTaken}
                  onClick={() => {
                    setTime(t);
                    setTimeout(() => setStep(2), 200);
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="reset-btn"
            onClick={() => setStep(0)}
            style={{ alignSelf: "flex-start", marginTop: "auto" }}
          >
            ← Cambiar cancha
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="player-step-label">03 · Confirma tu reserva</div>
          <div className="confirm-card">
            <div className="confirm-row">
              <span className="k">Cancha</span>
              <span className="v">{court?.name}</span>
            </div>
            <div className="confirm-row">
              <span className="k">Día</span>
              <span className="v">Miércoles · 06 may</span>
            </div>
            <div className="confirm-row">
              <span className="k">Hora</span>
              <span className="v mono">
                {time} — {endHour}
              </span>
            </div>
            <div className="confirm-row">
              <span className="k">Total</span>
              <span className="v mono">$60.000 COP</span>
            </div>
            <button type="button" className="confirm-cta" onClick={() => setStep(3)}>
              Confirmar reserva
            </button>
          </div>
          <button
            type="button"
            className="reset-btn"
            onClick={() => setStep(1)}
            style={{ alignSelf: "flex-start" }}
          >
            ← Cambiar horario
          </button>
        </>
      )}

      {step === 3 && (
        <div className="confirm-success">
          <div className="confirm-success-icon">
            <CheckIcon size={28} />
          </div>
          <h4>¡Reserva confirmada!</h4>
          <p>
            {court?.name} · {time} · 06 may
            <br />
            Recibirás un recordatorio por WhatsApp.
          </p>
          <button type="button" className="reset-btn" onClick={reset}>
            ↻ Reservar otra
          </button>
        </div>
      )}
    </div>
  );
}

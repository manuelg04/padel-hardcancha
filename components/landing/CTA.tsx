import { ArrowIcon, WhatsappIcon } from "./Icons";

export function CTA({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="cta" id="cta">
      <div className="cta-bg" />
      <div className="cta-inner">
        <div
          className="hero-eyebrow"
          style={{ justifyContent: "center", marginBottom: 20 }}
        >
          <span className="dot" />
          <span>Listos cuando tú lo estés</span>
        </div>
        <h2>
          Lleva tu club al
          <br />
          <span className="accent">siguiente nivel.</span>
        </h2>
        <p>
          Empieza a organizar tus reservas, canchas y operación desde una sola
          plataforma. Demo gratuita · sin compromiso.
        </p>
        <div className="cta-actions">
          <a href={ctaHref} className="btn btn-primary">
            Solicitar demo <ArrowIcon />
          </a>
          <a href={ctaHref} className="btn btn-ghost">
            <WhatsappIcon size={16} /> Hablar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

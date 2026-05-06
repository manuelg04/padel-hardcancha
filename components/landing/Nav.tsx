import { ArrowIcon } from "./Icons";

export function Nav({ ctaHref }: { ctaHref: string }) {
  return (
    <nav className="nav">
      <a href="#inicio" className="nav-brand">
        <span className="nav-brand-mark">CL</span>
        <span>CanchaLista</span>
      </a>
      <div className="nav-links">
        <a href="#producto">Producto</a>
        <a href="#funciona">Cómo funciona</a>
        <a href="#roles">Roles</a>
        <a href="#contacto">Contacto</a>
      </div>
      <a href={ctaHref} className="nav-cta">
        Solicitar demo <ArrowIcon />
      </a>
    </nav>
  );
}

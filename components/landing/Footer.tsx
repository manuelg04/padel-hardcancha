export function Footer() {
  return (
    <footer className="footer" id="contacto">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-name">CanchaLista</div>
            <p className="footer-brand-desc">
              El sistema operativo para clubes de pádel. Agenda, reservas y
              operación en una sola pantalla.
            </p>
          </div>
          <div className="footer-col">
            <h4>Producto</h4>
            <ul>
              <li>
                <a href="#producto">Funcionalidades</a>
              </li>
              <li>
                <a href="#funciona">Cómo funciona</a>
              </li>
              <li>
                <a href="#roles">Roles</a>
              </li>
              <li>
                <a href="#cta">Solicitar demo</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Compañía</h4>
            <ul>
              <li>
                <a href="#">Sobre nosotros</a>
              </li>
              <li>
                <a href="#">Blog</a>
              </li>
              <li>
                <a href="#">Soporte</a>
              </li>
              <li>
                <a href="#">Contacto</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="#">Términos</a>
              </li>
              <li>
                <a href="#">Privacidad</a>
              </li>
              <li>
                <a href="#">Cookies</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 CanchaLista · Todos los derechos reservados</span>
          <div className="santander-badge">
            <span className="flag" />
            <span>Hecho en Bucaramanga, Santander</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

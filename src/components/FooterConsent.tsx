import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaInfoCircle, FaQuestionCircle } from 'react-icons/fa';
import '../styles/footer.css';

export const FooterConsent: React.FC = () => {
  return (
    <footer className="site-footer" aria-label="Información legal y de protección de datos">
      <div className="footer-wrap">
        <div className="footer-brand">
          <div className="footer-icon" aria-hidden="true">
            <FaShieldAlt />
          </div>
          <div>
            <h3>Protección de datos y transparencia</h3>
            <p>
              Contenido legal y de protección de datos preparado. Las secciones se irán completando conforme
              a la documentación institucional.
            </p>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-links-title">
            <FaInfoCircle /> Accesos directos
          </div>
          <div className="footer-links-list">
            <Link className="footer-link" to="/acerca">
              <span>Acerca del proyecto</span>
              <FaInfoCircle aria-hidden="true" />
            </Link>
            <Link className="footer-link" to="/preguntas-frecuentes">
              <span>
                <FaQuestionCircle aria-hidden="true" /> Preguntas frecuentes
              </span>
              <FaQuestionCircle aria-hidden="true" />
            </Link>
            <Link className="footer-link" to="/privacidad">
              <span>Privacidad (preparado)</span>
              <FaShieldAlt aria-hidden="true" />
            </Link>
            <Link className="footer-link" to="/aviso-legal">
              <span>Aviso legal (preparado)</span>
              <FaInfoCircle aria-hidden="true" />
            </Link>
            <Link className="footer-link" to="/accesibilidad">
              <span>Accesibilidad (WCAG 2.1 AA)</span>
              <FaShieldAlt aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <div className="footer-copyright">
        © {new Date().getFullYear()} Gigantes y Cabezudos de Zaragoza
      </div>
    </footer>
  );
};
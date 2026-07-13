import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaInfoCircle, FaQuestionCircle, FaUniversalAccess, FaCookieBite } from 'react-icons/fa';
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
              Aplicación móvil para la gestión y seguimiento de la comparsa de Gigantes y Cabezudos 
              de Zaragoza durante las fiestas. Proyecto preparado para integración con APIs oficiales 
              del Ayuntamiento de Zaragoza.
            </p>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-links-title">
            <FaInfoCircle /> Información legal
          </div>
          <div className="footer-links-list">
            <Link className="footer-link" to="/aviso-legal">
              <span>Aviso legal</span>
              <FaInfoCircle aria-hidden="true" />
            </Link>
            <Link className="footer-link" to="/privacidad">
              <span>Política de privacidad</span>
              <FaShieldAlt aria-hidden="true" />
            </Link>
            <Link className="footer-link" to="/cookies">
              <span>Política de cookies</span>
              <FaCookieBite aria-hidden="true" />
            </Link>
            <Link className="footer-link" to="/accesibilidad">
              <span>Accesibilidad (WCAG 2.1 AA)</span>
              <FaUniversalAccess aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-links-title">
            <FaQuestionCircle /> Enlaces institucionales
          </div>
          <div className="footer-links-list">
            <a 
              className="footer-link" 
              href="https://www.zaragoza.es" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Ayuntamiento de Zaragoza (se abre en nueva ventana)"
            >
              <span>Ayuntamiento de Zaragoza</span>
              <FaInfoCircle aria-hidden="true" />
            </a>
            <a 
              className="footer-link" 
              href="https://www.zaragoza.es/ciudad/cultura/gigantes" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Fiestas de Gigantes y Cabezudos (se abre en nueva ventana)"
            >
              <span>Fiestas de Gigantes y Cabezudos</span>
              <FaInfoCircle aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-copyright">
        © {new Date().getFullYear()} Gigantes y Cabezudos de Zaragoza | Proyecto preparado para presentación al Ayuntamiento
      </div>
    </footer>
  );
};
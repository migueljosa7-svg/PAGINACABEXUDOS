import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaInfoCircle, FaQuestionCircle } from 'react-icons/fa';

export const FooterConsent: React.FC = () => {
  return (
    <footer className="site-footer" aria-label="Información legal y de protección de datos">
      <style>{`
        .site-footer {
          padding: 28px 16px;
          border-top: 1px solid hsl(var(--color-border));
          background: hsla(var(--color-bg-card), 0.65);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .footer-wrap {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 18px;
          align-items: start;
        }

        .footer-brand {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .footer-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: hsla(var(--color-primary), 0.08);
          border: 1px solid hsla(var(--color-primary), 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--color-primary));
          flex: 0 0 auto;
          font-size: 1.1rem;
        }

        .footer-brand h3 {
          margin: 0 0 6px 0;
          font-size: 1rem;
        }

        .footer-brand p {
          margin: 0;
          color: hsl(var(--color-text-secondary));
          line-height: 1.8;
          font-size: 0.95rem;
        }

        .footer-links {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .footer-links-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 900;
        }

        .footer-links-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .footer-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--border-radius-sm);
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          transition: all var(--transition-fast);
        }

        .footer-link:hover {
          transform: translateY(-1px);
          border-color: hsl(var(--color-primary));
          box-shadow: var(--shadow-sm);
        }

        .footer-link span {
          display: flex;
          align-items: center;
          gap: 10px;
          color: hsl(var(--color-text-primary));
          font-weight: 800;
          font-size: 0.92rem;
        }

        @media (max-width: 768px) {
          .footer-wrap {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

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

      <div
        style={{
          maxWidth: 1200,
          margin: '16px auto 0 auto',
          color: 'hsl(var(--color-text-secondary))',
          fontSize: '0.8rem',
          lineHeight: 1.6,
          textAlign: 'center',
        }}
      >
        © {new Date().getFullYear()} Gigantes y Cabezudos de Zaragoza
      </div>
    </footer>
  );
};


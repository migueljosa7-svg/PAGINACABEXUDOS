import React from 'react';
import { motion } from 'framer-motion';
import { FaCookieBite, FaInfoCircle, FaShieldAlt } from 'react-icons/fa';

export const Cookies: React.FC = () => {
  return (
    <div className="cookies-page layout-container">
      <style>{`
        .cookies-hero {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
        }
        .cookies-text {
          color: hsl(var(--color-text-secondary));
          line-height: 1.8;
        }
        .cookies-section {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 18px;
          margin-bottom: 14px;
        }
        .cookies-section h2 {
          margin: 0 0 10px 0;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
      `}</style>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="cookies-hero"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <FaCookieBite color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Política de cookies</h1>
        </div>
        <p className="cookies-text" style={{ margin: 0 }}>
          Información sobre el uso de cookies y tecnologías similares en esta aplicación web.
        </p>
      </motion.section>

      <div className="cookies-section">
        <h2>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          ¿Qué son las cookies?
        </h2>
        <p className="cookies-text" style={{ margin: 0 }}>
          Las cookies son pequeños archivos de texto que se almacenan en el dispositivo del usuario 
          para facilitar la navegación, conocer el uso que se hace del sitio web y mejorar la 
          experiencia de usuario. Este proyecto no utiliza cookies de seguimiento ni de analítica 
          de terceros.
        </p>
      </div>

      <div className="cookies-section">
        <h2>
          <FaShieldAlt color="hsl(var(--color-primary))" />
          Cookies propias
        </h2>
        <p className="cookies-text" style={{ margin: 0 }}>
          Esta aplicación utiliza únicamente cookies técnicas necesarias para:
        </p>
        <ul className="cookies-text" style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Almacenar preferencias de tema (claro/oscuro)</li>
          <li>Gestionar la lista de favoritos del usuario</li>
          <li>Mantener la sesión activa en el navegador</li>
        </ul>
      </div>

      <div className="cookies-section">
        <h2>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          Cookies de terceros
        </h2>
        <p className="cookies-text" style={{ margin: 0 }}>
          No se utilizan cookies de analítica, publicidad o redes sociales. La aplicación está 
          preparada para funcionar sin cookies externas, cumpliendo con el principio de 
          privacidad por defecto.
        </p>
      </div>

      <div className="cookies-section">
        <h2>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          Gestión de cookies
        </h2>
        <p className="cookies-text" style={{ margin: 0 }}>
          El usuario puede configurar su navegador para bloquear o eliminar las cookies. 
          La desactivación de cookies técnicas necesarias podría afectar algunas 
          funcionalidades de la aplicación.
        </p>
      </div>
    </div>
  );
};
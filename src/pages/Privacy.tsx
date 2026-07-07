import React from 'react';
import { motion } from 'framer-motion';
import { FaShieldAlt, FaInfoCircle } from 'react-icons/fa';

export const Privacy: React.FC = () => {
  return (
    <div className="privacy-page layout-container">
      <style>{`
        .privacy-hero {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
        }
        .privacy-text {
          color: hsl(var(--color-text-secondary));
          line-height: 1.8;
        }
        .privacy-section {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 18px;
          margin-bottom: 14px;
        }
        .privacy-section h2 {
          margin: 0 0 10px 0;
          font-size: 1.1rem;
        }
      `}</style>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="privacy-hero"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <FaShieldAlt color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Privacidad</h1>
        </div>
        <p className="privacy-text" style={{ margin: 0 }}>
          Esta sección se encuentra preparada para incorporar, en futuras versiones, la información legal y de
          protección de datos correspondiente.
        </p>

        <div style={{ marginTop: 14 }} className="privacy-section">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaInfoCircle style={{ color: 'hsl(var(--color-primary))' }} />
            Información preparada
          </h2>
          <p className="privacy-text" style={{ margin: 0 }}>
            En este momento, la aplicación utiliza almacenamiento local para preferencias del usuario (por ejemplo, tema
            y favoritos). No se transmiten datos a terceros en esta versión.
          </p>
        </div>
      </motion.section>

      <div className="privacy-section">
        <h2>Próximos contenidos</h2>
        <p className="privacy-text" style={{ margin: 0 }}>
          Trazabilidad de datos, finalidades, base jurídica, derechos de las personas usuarias y medidas de seguridad.
        </p>
      </div>
    </div>
  );
};


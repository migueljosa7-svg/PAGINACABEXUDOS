import React from 'react';
import { motion } from 'framer-motion';
import { FaGavel, FaInfoCircle } from 'react-icons/fa';

export const LegalNotice: React.FC = () => {
  return (
    <div className="legal-page layout-container">
      <style>{`
        .legal-hero {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
        }
        .legal-text {
          color: hsl(var(--color-text-secondary));
          line-height: 1.8;
        }
        .legal-section {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 18px;
          margin-bottom: 14px;
        }
        .legal-section h2 {
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
        className="legal-hero"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <FaGavel color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Aviso legal</h1>
        </div>
        <p className="legal-text" style={{ margin: 0 }}>
          Esta página se encuentra preparada para incorporar, en futuras versiones, la información jurídica y
          las condiciones de uso correspondientes.
        </p>
      </motion.section>

      <div className="legal-section">
        <h2>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          Contenido por completar
        </h2>
        <p className="legal-text" style={{ margin: 0 }}>
          Identificación del responsable, términos de uso, propiedad intelectual, enlaces, y cualquier otra
          información requerida.
        </p>
      </div>

      <div className="legal-section">
        <h2>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          Integración futura con datos oficiales
        </h2>
        <p className="legal-text" style={{ margin: 0 }}>
          En versiones posteriores, la aplicación podrá incorporar contenido procedente de APIs oficiales del
          Ayuntamiento, manteniendo un enfoque divulgativo e institucional.
        </p>
      </div>
    </div>
  );
};


import React from 'react';
import { motion } from 'framer-motion';
import { FaShieldAlt, FaUniversalAccess, FaKeyboard } from 'react-icons/fa';

export const AccessibilityCommitment: React.FC = () => {
  return (
    <div className="a11y-page layout-container">
      <style>{`
        .a11y-hero {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
        }
        .a11y-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          align-items: start;
        }
        .a11y-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 18px;
        }
        .a11y-card h2 {
          margin: 0 0 10px 0;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .a11y-card p {
          margin: 0;
          color: hsl(var(--color-text-secondary));
          line-height: 1.7;
        }
        @media (max-width: 768px) {
          .a11y-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="a11y-hero"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <FaUniversalAccess color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Accesibilidad</h1>
        </div>
        <p style={{ margin: 0, color: 'hsl(var(--color-text-secondary))', lineHeight: 1.7 }}>
          Compromiso de accesibilidad alineado con WCAG 2.1 AA para garantizar una experiencia usable y comprensible
          para el mayor número de personas.
        </p>
      </motion.section>

      <div className="a11y-grid">
        <div className="a11y-card">
          <h2><FaShieldAlt color="hsl(var(--color-primary))" /> Principios de diseño</h2>
          <p>
            Interfaz con contraste adecuado, estados de foco visibles, navegación por teclado y semántica orientada
            a una mejor comprensión.
          </p>
        </div>
        <div className="a11y-card">
          <h2><FaKeyboard color="hsl(var(--color-primary))" /> Navegación por teclado</h2>
          <p>
            Los controles interactivos están pensados para ser accesibles sin necesidad de ratón. Se mantiene la
            coherencia visual durante la navegación.
          </p>
        </div>
      </div>
    </div>
  );
};


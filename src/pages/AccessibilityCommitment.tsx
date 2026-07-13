import React from 'react';
import { motion } from 'framer-motion';
import { FaShieldAlt, FaUniversalAccess, FaKeyboard, FaEye, FaMobileAlt, FaCheckCircle } from 'react-icons/fa';

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
          <h1 style={{ margin: 0 }}>Accesibilidad (WCAG 2.1 AA)</h1>
        </div>
        <p style={{ margin: 0, color: 'hsl(var(--color-text-secondary))', lineHeight: 1.7 }}>
          Compromiso de accesibilidad alineado con las Pautas de Accesibilidad al Contenido Web 
          (WCAG 2.1 nivel AA) para garantizar una experiencia usable y comprensable para el 
          mayor número de personas.
        </p>
      </motion.section>

      <div className="a11y-grid">
        <div className="a11y-card">
          <h2><FaShieldAlt color="hsl(var(--color-primary))" /> Principios de diseño</h2>
          <p>
            Interfaz con contraste adecuado (ratio mínimo 4.5:1), estados de foco visibles, 
            navegación por teclado y semántica HTML orientada a una mejor comprensión por 
            tecnologías asistivas.
          </p>
        </div>
        <div className="a11y-card">
          <h2><FaKeyboard color="hsl(var(--color-primary))" /> Navegación por teclado</h2>
          <p>
            Todos los controles interactivos están diseñados para ser accesibles sin necesidad 
            de ratón. Se mantiene la coherencia visual durante la navegación y se respetan 
            los atajos de teclado estándar.
          </p>
        </div>
        <div className="a11y-card">
          <h2><FaEye color="hsl(var(--color-primary))" /> Contraste y legibilidad</h2>
          <p>
            Los textos y elementos interactivos cumplen con los requisitos de contraste WCAG 2.1 AA. 
            Se utilizan tamaños de fuente adaptables y se evita la presentación de información 
            únicamente mediante color.
          </p>
        </div>
        <div className="a11y-card">
          <h2><FaMobileAlt color="hsl(var(--color-primary))" /> Diseño responsivo</h2>
          <p>
            La aplicación está optimizada para dispositivos móviles, tablets y escritorio, 
            con gestos adaptados y áreas táctiles adecuadas (mínimo 44x44 píxeles).
          </p>
        </div>
      </div>

      <div className="a11y-card" style={{ marginTop: 18 }}>
        <h2><FaCheckCircle color="hsl(var(--color-primary))" /> Cumplimiento parcial</h2>
        <p>
          Esta aplicación está en desarrollo activo y cumple parcialmente con WCAG 2.1 AA. 
          Se irán implementando mejoras continuas en accesibilidad en próximas versiones, 
          incluyendo ARIA live regions para actualizaciones en tiempo real y soporte completo 
          para lectores de pantalla.
        </p>
      </div>
    </div>
  );
};
import React from 'react';
import { motion } from 'framer-motion';
import { FaQuestionCircle, FaShieldAlt, FaInfoCircle } from 'react-icons/fa';

type Item = { q: string; a: React.ReactNode };

const items: Item[] = [
  {
    q: '¿Qué es esta aplicación?',
    a: (
      <>
        Una guía digital de los Gigantes y Cabezudos de Zaragoza para consultar la información cultural y
        facilitar el acceso a agenda, recorridos y fichas.
      </>
    ),
  },
  {
    q: '¿La información es oficial?',
    a: (
      <>
        El objetivo es ofrecer contenidos con criterio institucional. La app está preparada para integrarse con
        fuentes oficiales mediante una API en futuras versiones.
      </>
    ),
  },
  {
    q: '¿Funciona sin conexión?',
    a: (
      <>
        La aplicación incluye soporte PWA para mejorar la experiencia. La disponibilidad offline depende del
        contenido precargado y del estado de la red.
      </>
    ),
  },
  {
    q: '¿Qué significa “modo en vivo” en el mapa?',
    a: (
      <>
        Actualmente se muestra una simulación para visualizar recorridos y estados. El diseño está listo para
        sustituir esa simulación por datos reales de localización cuando estén disponibles.
      </>
    ),
  },
  {
    q: 'Accesibilidad y uso',
    a: (
      <>
        Nos comprometemos con la accesibilidad y con prácticas alineadas con WCAG 2.1 AA, para que la aplicación sea usable
        para el mayor número de personas.
      </>
    ),
  },
];

export const FAQ: React.FC = () => {
  return (
    <div className="faq-page layout-container">
      <style>{`
        .faq-hero {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
        }
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        details {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          box-shadow: var(--shadow-sm);
        }
        summary {
          cursor: pointer;
          list-style: none;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
          outline: none;
        }
        summary::-webkit-details-marker { display: none; }
        details p {
          margin-top: 10px;
          color: hsl(var(--color-text-secondary));
          line-height: 1.7;
        }
      `}</style>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="faq-hero"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaQuestionCircle color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Preguntas frecuentes</h1>
        </div>
        <p style={{ margin: '10px 0 0 0', color: 'hsl(var(--color-text-secondary))', lineHeight: 1.7 }}>
          Información para resolver dudas habituales sobre el funcionamiento y el enfoque de la aplicación.
        </p>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid hsl(var(--color-border))', background: 'hsl(var(--color-bg-card))', color: 'hsl(var(--color-text-secondary))', fontSize: '0.85rem', fontWeight: 700 }}>
            <FaShieldAlt style={{ marginRight: 6, verticalAlign: 'middle' }} /> Privacidad y seguridad (preparado)
          </span>
          <span style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid hsl(var(--color-border))', background: 'hsl(var(--color-bg-card))', color: 'hsl(var(--color-text-secondary))', fontSize: '0.85rem', fontWeight: 700 }}>
            <FaInfoCircle style={{ marginRight: 6, verticalAlign: 'middle' }} /> Integración futura con API oficial
          </span>
        </div>
      </motion.section>

      <div className="faq-list">
        {items.map((it, idx) => (
          <details key={idx}>
            <summary>
              <FaInfoCircle style={{ color: 'hsl(var(--color-primary))' }} />
              {it.q}
            </summary>
            <p>{it.a}</p>
          </details>
        ))}
      </div>

      <div style={{ marginTop: 18, color: 'hsl(var(--color-text-secondary))', lineHeight: 1.7 }}>
        Si necesitas información adicional, revisa la sección “Acerca del proyecto” y el apartado de “Patrimonio”.
      </div>
    </div>
  );
};


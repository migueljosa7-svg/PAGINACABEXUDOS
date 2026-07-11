import React from 'react';
import { motion } from 'framer-motion';
import { FaInfoCircle, FaUsers, FaMapMarkedAlt, FaHandsHelping } from 'react-icons/fa';

export const About: React.FC = () => {
  return (
    <div className="about-page layout-container">
      <style>{`
        .about-hero {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
        }
        .about-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 18px;
          align-items: start;
        }
        .about-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 18px;
        }
        .about-card h2 {
          margin: 0 0 10px 0;
        }
        .about-card p {
          color: hsl(var(--color-text-secondary));
          line-height: 1.7;
          margin: 0;
        }
        .about-points {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .about-point {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px;
          border-radius: var(--border-radius-sm);
          background: hsla(var(--color-primary), 0.06);
          border: 1px solid hsla(var(--color-primary), 0.15);
        }
        .about-point-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          color: hsl(var(--color-primary));
          flex: 0 0 auto;
          font-size: 1.1rem;
        }
        .about-point b {
          display: block;
          margin-bottom: 4px;
        }
        .about-point span {
          color: hsl(var(--color-text-secondary));
          line-height: 1.6;
          font-size: 0.95rem;
        }
        @media (max-width: 768px) {
          .about-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="about-hero"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Acerca del proyecto</h1>
        </div>
        <p style={{ margin: 0, color: 'hsl(var(--color-text-secondary))', lineHeight: 1.7 }}>
          Esta aplicación pretende acercar el patrimonio cultural de los Gigantes y Cabezudos de Zaragoza a ciudadanos y
          visitantes, mejorando el acceso a información durante las fiestas y fomentando la participación.
        </p>

        <div className="about-grid" style={{ marginTop: 18 }}>
          <div className="about-points">
            <div className="about-point">
              <div className="about-point-icon">
                <FaMapMarkedAlt />
              </div>
              <div>
                <b>Información clara y accesible</b>
                <span>Agenda, recorridos y fichas para conocer el contexto histórico y cultural.</span>
              </div>
            </div>
            <div className="about-point">
              <div className="about-point-icon">
                <FaUsers />
              </div>
              <div>
                <b>Impulso a la participación</b>
                <span>Herramientas de exploración que invitan a descubrir y compartir la tradición.</span>
              </div>
            </div>
            <div className="about-point">
              <div className="about-point-icon">
                <FaHandsHelping />
              </div>
              <div>
                <b>Arquitectura preparada para integración</b>
                <span>
                  Diseñada para conectar con APIs oficiales del Ayuntamiento. El sistema está preparado para GPS real en tiempo real,
                  donde cada comparsa llevará su propio dispositivo GPS independiente en la calle.
                </span>
              </div>
            </div>
          </div>

          <div className="about-card">
            <h2 style={{ fontSize: '1.1rem' }}>Compromiso institucional</h2>
            <p>
              Nuestro objetivo es ofrecer una experiencia moderna, respetuosa y consistente, con contenido diseñado para un
              uso público. La información se presentará con criterio divulgativo e institucional.
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid hsl(var(--color-border))', background: 'hsl(var(--color-bg-card))', color: 'hsl(var(--color-text-secondary))', fontSize: '0.85rem', fontWeight: 700 }}>
                Datos y contenidos estructurados
              </span>
              <span style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid hsl(var(--color-border))', background: 'hsl(var(--color-bg-card))', color: 'hsl(var(--color-text-secondary))', fontSize: '0.85rem', fontWeight: 700 }}>
                Accesibilidad WCAG 2.1 AA
              </span>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};


import React from 'react';
import { motion } from 'framer-motion';
import { FaHandsHelping, FaBuilding, FaUsers, FaRegLightbulb } from 'react-icons/fa';

export const Collaboration: React.FC = () => {
  return (
    <div className="collaboration-page layout-container">
      <style>{`
        .collab-hero {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
        }
        .collab-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .collab-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 18px;
          min-height: 140px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .collab-logo {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: hsla(var(--color-primary), 0.08);
          border: 1px solid hsla(var(--color-primary), 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--color-primary));
          font-size: 1.3rem;
        }
        .collab-card h2 {
          margin: 0;
          font-size: 1.05rem;
        }
        .collab-card p {
          margin: 0;
          color: hsl(var(--color-text-secondary));
          line-height: 1.7;
          font-size: 0.95rem;
        }
        .collab-note {
          margin-top: 14px;
          color: hsl(var(--color-text-secondary));
          line-height: 1.7;
          font-size: 0.95rem;
        }
      `}</style>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="collab-hero"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <FaHandsHelping color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Colaboran</h1>
        </div>
        <p style={{ margin: 0, color: 'hsl(var(--color-text-secondary))', lineHeight: 1.7 }}>
          Esta sección está preparada para incluir, en futuras publicaciones, a las instituciones y entidades
          colaboradoras. Por ahora utiliza marcadores de posición elegantes, sin afirmar acuerdos existentes.
        </p>
      </motion.section>

      <div className="collab-grid">
        <div className="collab-card">
          <div className="collab-logo"><FaBuilding /></div>
          <h2>Ayuntamiento de Zaragoza</h2>
          <p>Marcador de posición: pendiente de completar con información oficial.</p>
        </div>
        <div className="collab-card">
          <div className="collab-logo"><FaBuilding /></div>
          <h2>Juntas Municipales</h2>
          <p>Marcador de posición: preparado para integración institucional.</p>
        </div>
        <div className="collab-card">
          <div className="collab-logo"><FaBuilding /></div>
          <h2>Juntas Vecinales</h2>
          <p>Marcador de posición: preparado para colaboración vecinal.</p>
        </div>
        <div className="collab-card">
          <div className="collab-logo"><FaUsers /></div>
          <h2>Asociaciones de Vecinos</h2>
          <p>Marcador de posición: preparado para participación ciudadana.</p>
        </div>
        <div className="collab-card">
          <div className="collab-logo"><FaRegLightbulb /></div>
          <h2>Asociaciones Giganteras</h2>
          <p>Marcador de posición: preparado para coordinación cultural.</p>
        </div>
      </div>

      <div className="collab-note">
        Nota: esta página no afirma colaboraciones existentes y se actualizará cuando se disponga de contenido oficial.
      </div>
    </div>
  );
};


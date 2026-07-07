import React from 'react';
import { motion } from 'framer-motion';
import { FaBookOpen, FaLandmark, FaInfoCircle, FaUsers, FaHistory } from 'react-icons/fa';

export const Heritage: React.FC = () => {
  return (
    <div className="heritage-page layout-container">
      <style>{`
        .heritage-hero {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
        }
        .heritage-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          align-items: start;
        }
        .heritage-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 18px;
        }
        .heritage-card h2 {
          margin: 0 0 10px 0;
          font-size: 1.15rem;
        }
        .heritage-card p {
          margin: 0;
          color: hsl(var(--color-text-secondary));
          line-height: 1.7;
        }
        .heritage-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .heritage-bullets {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .heritage-bullet {
          padding: 14px;
          border-radius: var(--border-radius-sm);
          background: hsla(var(--color-primary), 0.06);
          border: 1px solid hsla(var(--color-primary), 0.16);
        }
        .heritage-bullet b { display: block; margin-bottom: 4px; }
        .heritage-bullet span {
          color: hsl(var(--color-text-secondary));
          line-height: 1.6;
          font-size: 0.95rem;
        }
        @media (max-width: 768px) {
          .heritage-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="heritage-hero"
      >
        <div className="heritage-section-title">
          <FaLandmark color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Patrimonio</h1>
        </div>
        <p>
          Conoce el valor histórico y cultural de la Comparsa Municipal de Zaragoza y de las comparsas de barrio,
          desde una perspectiva divulgativa e institucional.
        </p>
      </motion.section>

      <div className="heritage-grid">
        <div className="heritage-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaHistory color="hsl(var(--color-primary))" />
            La tradición como patrimonio vivo
          </h2>
          <p>
            La Comparsa de Gigantes y Cabezudos forma parte del relato cultural de Zaragoza: una expresión colectiva
            que se mantiene gracias a la transmisión de saberes, la participación ciudadana y la continuidad de sus
            salidas durante las fiestas.
          </p>

          <div style={{ height: 14 }} />

          <div className="heritage-bullets">
            <div className="heritage-bullet">
              <b>Identidad y memoria</b>
              <span>Historias, símbolos y personajes que ayudan a comprender la evolución de la ciudad.</span>
            </div>
            <div className="heritage-bullet">
              <b>Participación</b>
              <span>La programación y la información facilitan el acceso a actividades y recorridos.</span>
            </div>
            <div className="heritage-bullet">
              <b>Accesibilidad a la información</b>
              <span>Una guía digital que acerca el patrimonio cultural a ciudadanos y visitantes.</span>
            </div>
          </div>
        </div>

        <div className="heritage-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaUsers color="hsl(var(--color-primary))" />
            Comparsas municipales y de barrio
          </h2>
          <p>
            Además de la Comparsa Municipal, existen comparsas vinculadas a barrios y pueblos que enriquecen la
            vida cultural. El objetivo de esta sección es ofrecer contexto, divulgación y una visión integradora.
          </p>

          <div style={{ height: 14 }} />

          <div className="heritage-bullets">
            <div className="heritage-bullet">
              <b>Municipal</b>
              <span>Personajes y recorridos asociados a la programación oficial.</span>
            </div>
            <div className="heritage-bullet">
              <b>Barrios</b>
              <span>Iniciativas vecinales con identidad propia, que complementan la fiesta.</span>
            </div>
            <div className="heritage-bullet">
              <b>Pueblos</b>
              <span>Tradiciones rurales que aportan variedad y continuidad cultural.</span>
            </div>
          </div>

          <div style={{ height: 16 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FaInfoCircle />
              Esta página está preparada para incorporar contenidos oficiales provenientes de una API en versiones futuras.
            </span>
          </p>

          <div style={{ height: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaBookOpen color="hsl(var(--color-accent))" />
            <span style={{ color: 'hsl(var(--color-text-secondary))' }}>
              Consulte también Enciclopedia y Agenda para acceder a fichas y eventos.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


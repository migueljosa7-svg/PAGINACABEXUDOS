import React from 'react';
import { motion } from 'framer-motion';
import { FaStream, FaMapMarkedAlt, FaRobot } from 'react-icons/fa';

export const RealtimeInfo: React.FC = () => {
  return (
    <div className="realtime-info-page layout-container">
      <style>{`
        .rt-hero {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
        }
        .rt-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 18px;
          align-items: start;
        }
        .rt-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 18px;
        }
        .rt-card p {
          margin: 0;
          color: hsl(var(--color-text-secondary));
          line-height: 1.8;
        }
        @media (max-width: 768px) {
          .rt-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rt-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <FaStream color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Información en tiempo real</h1>
        </div>
         <p style={{ margin: 0, color: 'hsl(var(--color-text-secondary))', lineHeight: 1.8 }}>
           El mapa recibe la ubicación de los dispositivos autorizados y actualiza la posición y el recorrido sin recargar
           la página. La emisión comienza únicamente cuando el responsable activa el GPS desde su enlace seguro y concede
           permiso de ubicación en el dispositivo.
         </p>

        <div className="rt-grid" style={{ marginTop: 18 }}>
          <div className="rt-card">
            <p>
              <b>Mapa y estado del recorrido:</b> el panel muestra la evolución del itinerario, con indicadores
              profesionales para facilitar la comprensión.
            </p>
            <p style={{ marginTop: 10 }}>
              <b>Emisión controlada:</b> el dispositivo puede detener la transmisión manualmente y dispone de un cierre
              automático de seguridad configurable.
            </p>
          </div>

          <div className="rt-card">
            <p>
              <b>Componentes listos:</b>
              <br />
              • API de recorridos
              <br />
              • API de eventos
              <br />
              • API de comparsas
              <br />
              • API de localización en tiempo real
            </p>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'hsl(var(--color-text-secondary))', fontWeight: 700 }}>
              <FaRobot /> Arquitectura preparada
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'hsl(var(--color-text-secondary))', fontSize: '0.95rem', lineHeight: 1.7 }}>
          <FaMapMarkedAlt />
          El contenido visual se integra con el mapa manteniendo una experiencia uniforme.
        </div>
      </motion.section>
    </div>
  );
};

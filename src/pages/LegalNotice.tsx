import React from 'react';
import { motion } from 'framer-motion';
import { FaGavel, FaInfoCircle, FaCopyright } from 'react-icons/fa';

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
          Condiciones de uso de la aplicación web de Gigantes y Cabezudos de Zaragoza.
        </p>
      </motion.section>

      <div className="legal-section">
        <h2>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          Titular y responsable
        </h2>
        <p className="legal-text" style={{ margin: 0 }}>
          <strong>Proyecto:</strong> Gigantes y Cabezudos de Zaragoza<br />
          <strong>Destinatario:</strong> Ayuntamiento de Zaragoza<br />
          <strong>Finalidad:</strong> Aplicación móvil para la gestión y seguimiento de la comparsa 
          durante las fiestas tradicionales.
        </p>
      </div>

      <div className="legal-section">
        <h2>
          <FaCopyright color="hsl(var(--color-primary))" />
          Propiedad intelectual
        </h2>
        <p className="legal-text" style={{ margin: 0 }}>
          Los contenidos, diseños y código fuente de esta aplicación son propiedad del titular 
          y se encuentran protegidos por la legislación de propiedad intelectual. Queda prohibida 
          su reproducción, distribución, comunicación pública o transformación sin autorización 
          expresa, salvo en los casos previstos por la Ley.
        </p>
      </div>

      <div className="legal-section">
        <h2>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          Condiciones de uso
        </h2>
        <p className="legal-text" style={{ margin: 0 }}>
          La utilización de esta aplicación implica la aceptación de las siguientes condiciones:
        </p>
        <ul className="legal-text" style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Contenidos con fines estrictamente informativos y divulgativos</li>
          <li>Prohibida la utilización con fines comerciales no autorizados</li>
          <li>Los datos de localización son temporales y se utilizan exclusivamente para 
              seguimiento durante eventos</li>
          <li>El titular se reserva el derecho a modificar, suspender o eliminar 
              contenidos sin previo aviso</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          Responsabilidad
        </h2>
        <p className="legal-text" style={{ margin: 0 }}>
          El titular no garantiza la ausencia de errores en los contenidos, ni que estén 
          actualizados. No se asumen responsabilidades por daños y perjuicios de cualquier 
          naturaleza que pudieran derivarse del uso de la información, datos o servicios 
          incluidos en este proyecto.
        </p>
      </div>

      <div className="legal-section">
        <h2>
          <FaInfoCircle color="hsl(var(--color-primary))" />
          Legislación aplicable
        </h2>
        <p className="legal-text" style={{ margin: 0 }}>
          Este aviso legal se regirá por las leyes españolas. Para cualquier conflicto, 
          competencia para resolverlo corresponde a los Juzgados y Tribunales de Zaragoza, 
          con el usuario expresando su renuncia a cualquier otro fuero que pudiera corresponderle.
        </p>
      </div>
    </div>
  );
};
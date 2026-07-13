import React from 'react';
import { motion } from 'framer-motion';
import { FaShieldAlt, FaInfoCircle, FaMapMarkedAlt, FaWifi } from 'react-icons/fa';

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
          <h1 style={{ margin: 0 }}>Política de privacidad</h1>
        </div>
        <p className="privacy-text" style={{ margin: 0 }}>
          Información sobre el tratamiento de datos personales y el uso de tecnologías de localización.
        </p>
      </motion.section>

      <div className="privacy-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaInfoCircle style={{ color: 'hsl(var(--color-primary))' }} />
          Responsable del tratamiento
        </h2>
        <p className="privacy-text" style={{ margin: 0 }}>
          <strong>Responsable:</strong> Proyecto Gigantes y Cabezudos de Zaragoza<br />
          <strong>Finalidad:</strong> Gestión y seguimiento de la comparsa durante las fiestas<br />
          <strong>Base jurídica:</strong> Interés legítimo en la gestión cultural (art. 6.1.f RGPD)
        </p>
      </div>

      <div className="privacy-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaMapMarkedAlt style={{ color: 'hsl(var(--color-primary))' }} />
          Uso de GPS por WebSockets
        </h2>
        <p className="privacy-text" style={{ margin: 0 }}>
          La funcionalidad de localización en tiempo real utiliza WebSockets para transmitir datos de 
          posición geográfica entre dispositivos. Los datos de GPS se transmiten de forma cifrada y 
          únicamente durante la sesión activa del evento. No se almacenan datos de localización 
          permanentemente ni se comparten con terceros.
        </p>
      </div>

      <div className="privacy-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaWifi style={{ color: 'hsl(var(--color-primary))' }} />
          Datos técnicos recopilados
        </h2>
        <p className="privacy-text" style={{ margin: 0 }}>
          La aplicación recopila únicamente los siguientes datos técnicos necesarios para su 
          funcionamiento:
        </p>
        <ul className="privacy-text" style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Preferencias de tema (claro/oscuro) - almacenadas localmente</li>
          <li>Lista de favoritos - almacenada localmente en el dispositivo</li>
          <li>Datos de posición GPS - transmitidos en tiempo real vía WebSocket, no persistidos</li>
        </ul>
      </div>

      <div className="privacy-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaInfoCircle style={{ color: 'hsl(var(--color-primary))' }} />
          Derechos de los usuarios
        </h2>
        <p className="privacy-text" style={{ margin: 0 }}>
          Los usuarios pueden ejercer sus derechos de acceso, rectificación, supresión, limitación 
          y portabilidad contactando a través de los canales oficiales del Ayuntamiento de Zaragoza. 
          Asimismo, tienen derecho a presentar una reclamación ante la Agencia Española de 
          Protección de Datos (AEPD).
        </p>
      </div>

      <div className="privacy-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaShieldAlt style={{ color: 'hsl(var(--color-primary))' }} />
          Medidas de seguridad
        </h2>
        <p className="privacy-text" style={{ margin: 0 }}>
          Se implementan medidas técnicas y organizativas adecuadas para garantizar la 
          confidencialidad, integridad y disponibilidad de los datos, incluyendo el uso de 
          conexiones cifradas (HTTPS/WSS) y el mínimo necesario de datos personales.
        </p>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaCookieBite, FaCheck } from 'react-icons/fa';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem('cookies-accepted');
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  // Publica su altura en --cookie-banner-h para que el asistente y demás
  // elementos flotantes se coloquen encima y nunca queden tapados.
  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!isVisible || !el) {
      root.style.removeProperty('--cookie-banner-h');
      return;
    }
    const publish = () => root.style.setProperty('--cookie-banner-h', `${el.offsetHeight}px`);
    publish();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null;
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--cookie-banner-h');
    };
  }, [isVisible]);

  const handleAccept = () => {
    localStorage.setItem('cookies-accepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-banner" ref={ref} role="dialog" aria-label="Aviso de cookies">
      <style>{`
        .cookie-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: hsla(var(--color-bg-card), 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-top: 1px solid hsl(var(--color-border));
          padding: 12px 16px;
          z-index: 1150;
          pointer-events: auto;
        }
        @media (max-width: 768px) {
          .cookie-banner {
            bottom: calc(var(--nav-height-mobile) + env(safe-area-inset-bottom, 0px));
            border-radius: 16px 16px 0 0;
          }
        }
        .cookie-banner-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .cookie-banner-text {
          color: hsl(var(--color-text-primary));
          font-size: 0.85rem;
          line-height: 1.5;
          flex: 1;
          min-width: 200px;
        }
        .cookie-banner-text a {
          color: hsl(var(--color-primary));
          text-decoration: underline;
        }
        .cookie-banner-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--border-radius-sm);
          border: 1px solid hsl(var(--color-primary));
          background: hsl(var(--color-primary));
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .cookie-banner-btn:hover {
          opacity: 0.9;
        }
        @media (max-width: 768px) {
          .cookie-banner-content {
            flex-direction: column;
            text-align: center;
          }
          .cookie-banner-text {
            min-width: unset;
          }
        }
      `}</style>

      <div className="cookie-banner-content">
        <div className="cookie-banner-text">
          <FaCookieBite style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Esta aplicación utiliza únicamente cookies técnicas necesarias para el funcionamiento. 
          <Link to="/cookies">Más información</Link>
        </div>
        <button className="cookie-banner-btn" onClick={handleAccept}>
          <FaCheck /> Aceptar
        </button>
      </div>
    </div>
  );
};
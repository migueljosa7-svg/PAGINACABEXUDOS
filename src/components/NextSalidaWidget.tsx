import React, { useMemo } from 'react';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { calendarEvents } from '../data/calendarData';

export const NextSalidaWidget: React.FC = () => {
  const nextEvent = useMemo(() => {
    const today = new Date();
    const upcoming = [...calendarEvents]
      .filter((event) => new Date(`${event.date}T00:00:00`) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return upcoming;
  }, []);

  if (!nextEvent) return null;

  return (
    <section style={{ background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(var(--color-secondary)) 100%)', color: 'white', borderRadius: 'var(--border-radius-md)', padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <FaCalendarAlt />
        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Próxima salida</h3>
      </div>
      <h4 style={{ margin: '0 0 8px' }}>{nextEvent.title}</h4>
      <p style={{ margin: '0 0 10px', opacity: 0.95 }}>{nextEvent.description}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.9rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaClock /> {nextEvent.time || 'Sin hora'}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaMapMarkerAlt /> {nextEvent.location}</span>
      </div>
    </section>
  );
};

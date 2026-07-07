import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaCalendarAlt, FaBookOpen, FaBullhorn, FaRoute } from 'react-icons/fa';
import { comparsaMembers } from '../data/comparsaData';
import { calendarEvents } from '../data/calendarData';
import { newsItems } from '../data/advancedContent';

const searchSections = [
  { label: 'Personajes', icon: <FaBookOpen /> },
  { label: 'Eventos', icon: <FaCalendarAlt /> },
  { label: 'Noticias', icon: <FaBullhorn /> },
  { label: 'Rutas', icon: <FaRoute /> }
];

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { characters: [], events: [], news: [], routes: [] };

    return {
      characters: comparsaMembers.filter((member) =>
        [member.name, member.description, member.history, member.creator].some((value) => value.toLowerCase().includes(q))
      ),
      events: calendarEvents.filter((event) =>
        [event.title, event.description, event.location, event.comparsa || '', event.barrio || ''].some((value) => value.toLowerCase().includes(q))
      ),
      news: newsItems.filter((item) => [item.title, item.excerpt, item.tag].some((value) => value.toLowerCase().includes(q))),
      routes: []
    };
  }, [query]);

  return (
    <section style={{ background: 'hsl(var(--color-bg-card))', border: '1px solid hsl(var(--color-border))', borderRadius: 'var(--border-radius-md)', padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <FaSearch color="hsl(var(--color-primary))" />
        <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Buscador global</h3>
      </div>
      <div style={{ position: 'relative' }}>
        <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--color-text-secondary))' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca personajes, eventos, noticias..."
          style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 999, border: '1px solid hsl(var(--color-border))', background: 'hsl(var(--color-bg-secondary))', color: 'hsl(var(--color-text-primary))' }}
        />
      </div>

      {!query && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {searchSections.map((section) => (
            <span key={section.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'hsl(var(--color-bg-secondary))', fontSize: '0.8rem' }}>
              {section.icon} {section.label}
            </span>
          ))}
        </div>
      )}

      {query && (
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {results.characters.length > 0 && (
            <div>
              <strong style={{ display: 'block', marginBottom: 6 }}>Personajes</strong>
              {results.characters.slice(0, 3).map((item) => (
                <Link key={item.id} to={`/personaje/${item.id}`} style={{ display: 'block', padding: '8px 10px', borderRadius: 10, background: 'hsl(var(--color-bg-secondary))', marginBottom: 6 }}>
                  {item.name}
                </Link>
              ))}
            </div>
          )}
          {results.events.length > 0 && (
            <div>
              <strong style={{ display: 'block', marginBottom: 6 }}>Eventos</strong>
              {results.events.slice(0, 3).map((item) => (
                <div key={item.id} style={{ padding: '8px 10px', borderRadius: 10, background: 'hsl(var(--color-bg-secondary))', marginBottom: 6 }}>
                  {item.title}
                </div>
              ))}
            </div>
          )}
          {results.news.length > 0 && (
            <div>
              <strong style={{ display: 'block', marginBottom: 6 }}>Noticias</strong>
              {results.news.slice(0, 3).map((item) => (
                <div key={item.id} style={{ padding: '8px 10px', borderRadius: 10, background: 'hsl(var(--color-bg-secondary))', marginBottom: 6 }}>
                  {item.title}
                </div>
              ))}
            </div>
          )}
          {(results.characters.length + results.events.length + results.news.length) === 0 && (
            <div style={{ padding: 12, color: 'hsl(var(--color-text-secondary))' }}>No hay resultados para esa búsqueda.</div>
          )}
        </div>
      )}
    </section>
  );
};

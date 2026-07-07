import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBookOpen, FaBullhorn, FaRoute, FaClock, FaImages, FaVideo, FaHistory } from 'react-icons/fa';
import { galleryItems, videoItems, newsItems, historyMilestones } from '../data/advancedContent';
import { useAppStore } from '../hooks/store';

const cards = [
  { title: 'Historia de la Comparsa', description: 'Recorre los hitos y cambios más importantes de la tradición zaragozana.', path: '/historia', icon: <FaHistory /> },
  { title: 'Galería de imágenes', description: 'Explora fotografías del desfile y de los personajes más emblemáticos.', path: '/galeria', icon: <FaImages /> },
  { title: 'Galería de vídeos', description: 'Disfruta de grabaciones y documentales de salidas y actos.', path: '/videos', icon: <FaVideo /> },
  { title: 'Noticias', description: 'Consulta novedades, anuncios y próximos actos.', path: '/noticias', icon: <FaBullhorn /> },
  { title: 'Rutas históricas', description: 'Descubre recorridos guiados por el patrimonio urbano.', path: '/rutas', icon: <FaRoute /> },
  { title: 'Cronología', description: 'Sigue la evolución de personajes y fiestas en una línea del tiempo.', path: '/cronologia', icon: <FaClock /> }
];

export const AdvancedPages: React.FC = () => {
  const { favorites } = useAppStore();
  const location = useLocation();
  const activeSection = location.pathname.replace(/^\/+|\/+$/g, '') || 'home';

  const summary = useMemo(() => ({
    favoritesCount: favorites.length,
    galleries: galleryItems.length,
    videos: videoItems.length,
    news: newsItems.length
  }), [favorites.length]);

  return (
    <div className="layout-container" style={{ paddingBottom: 40 }}>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'hsl(var(--color-bg-card))', border: '1px solid hsl(var(--color-border))', borderRadius: 'var(--border-radius-md)', padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <FaBookOpen color="hsl(var(--color-primary))" />
          <h1 style={{ margin: 0 }}>Contenido avanzado de la Comparsa</h1>
        </div>
        <p style={{ color: 'hsl(var(--color-text-secondary))', margin: 0, lineHeight: 1.6 }}>
          Accede a la historia, las noticias, rutas y el material multimedia de la comparsa desde un panel unificado.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          {cards.map((card) => (
            <Link key={card.path} to={card.path} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '12px 14px', borderRadius: 12, background: activeSection === card.path.replace('/', '') ? 'hsla(var(--color-primary), 0.12)' : 'hsl(var(--color-bg-secondary))', minWidth: 180, border: `1px solid ${activeSection === card.path.replace('/', '') ? 'hsl(var(--color-primary))' : 'hsl(var(--color-border))'}` }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 999, background: 'hsla(var(--color-primary), 0.12)', color: 'hsl(var(--color-primary))', marginBottom: 8 }}>{card.icon}</div>
                <strong style={{ display: 'block', marginBottom: 4 }}>{card.title}</strong>
                <span style={{ fontSize: '0.82rem', color: 'hsl(var(--color-text-secondary))' }}>{card.description}</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: 'hsl(var(--color-bg-card))', border: '1px solid hsl(var(--color-border))', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{summary.favoritesCount}</div>
          <div style={{ color: 'hsl(var(--color-text-secondary))' }}>Favoritos guardados</div>
        </div>
        <div style={{ background: 'hsl(var(--color-bg-card))', border: '1px solid hsl(var(--color-border))', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{summary.galleries}</div>
          <div style={{ color: 'hsl(var(--color-text-secondary))' }}>Imágenes en galería</div>
        </div>
        <div style={{ background: 'hsl(var(--color-bg-card))', border: '1px solid hsl(var(--color-border))', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{summary.videos}</div>
          <div style={{ color: 'hsl(var(--color-text-secondary))' }}>Vídeos disponibles</div>
        </div>
        <div style={{ background: 'hsl(var(--color-bg-card))', border: '1px solid hsl(var(--color-border))', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{summary.news}</div>
          <div style={{ color: 'hsl(var(--color-text-secondary))' }}>Noticias recientes</div>
        </div>
      </div>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'hsl(var(--color-bg-card))', border: '1px solid hsl(var(--color-border))', borderRadius: 'var(--border-radius-md)', padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Historia de la Comparsa</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {historyMilestones.map((item) => (
            <div key={item.id} style={{ borderLeft: '3px solid hsl(var(--color-primary))', paddingLeft: 12 }}>
              <div style={{ fontWeight: 800 }}>{item.year} · {item.title}</div>
              <div style={{ color: 'hsl(var(--color-text-secondary))', marginTop: 4 }}>{item.description}</div>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
};

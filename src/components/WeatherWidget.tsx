import React, { useEffect, useState } from 'react';
import { FaCloudSun, FaMapMarkerAlt } from 'react-icons/fa';

interface WeatherData {
  temp: number;
  description: string;
}

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.65&longitude=-0.88&current_weather=true');
        if (!res.ok) throw new Error('No se pudo cargar el tiempo');
        const data = await res.json();
        setWeather({
          temp: data.current_weather?.temperature ?? 0,
          description: 'Tiempo actual preparado para API'
        });
      } catch {
        setError('Preparado para conectar con una API meteorológica');
      }
    };

    loadWeather();
  }, []);

  return (
    <section style={{ background: 'hsl(var(--color-bg-card))', border: '1px solid hsl(var(--color-border))', borderRadius: 'var(--border-radius-md)', padding: 18, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <FaCloudSun color="hsl(var(--color-primary))" />
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Meteorología</h3>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{weather ? `${weather.temp}°C` : '—'}</div>
          <div style={{ color: 'hsl(var(--color-text-secondary))', fontSize: '0.85rem' }}>{error || weather?.description || 'Cargando...'}</div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--color-primary))' }}>
          <FaMapMarkerAlt /> Zaragoza
        </div>
      </div>
    </section>
  );
}

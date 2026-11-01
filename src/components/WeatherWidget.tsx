import React, { useEffect, useState } from 'react';
import { FaCloudSun, FaMapMarkerAlt } from 'react-icons/fa';

interface WeatherData {
  temp: number;
  description: string;
}

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla helada',
  51: 'Llovizna débil',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  61: 'Lluvia débil',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  71: 'Nieve débil',
  73: 'Nieve moderada',
  75: 'Nieve intensa',
  80: 'Chubascos débiles',
  81: 'Chubascos moderados',
  82: 'Chubascos intensos',
  95: 'Tormenta',
  96: 'Tormenta con granizo',
  99: 'Tormenta intensa con granizo',
};

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.65&longitude=-0.88&current_weather=true');
        if (!res.ok) throw new Error('No se pudo cargar el tiempo');
        const data = await res.json();
        const currentWeather = data.current_weather;
        if (!currentWeather || typeof currentWeather.temperature !== 'number') {
          throw new Error('La respuesta meteorológica no contiene condiciones actuales');
        }
        setWeather({
          temp: currentWeather.temperature,
          description: WEATHER_DESCRIPTIONS[currentWeather.weathercode] ?? 'Condiciones actuales',
        });
      } catch {
        setError('Tiempo no disponible ahora.');
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

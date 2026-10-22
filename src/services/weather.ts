import { useEffect, useState } from 'react';
import type { Location } from '../types';

// Open-Meteo: free, no API key. https://open-meteo.com
export interface Weather {
  temp: number;
  code: number;
  max: number;
  min: number;
  rainChance: number;
  fetchedAt: number;
}

const CACHE_KEY = 'wall-tablet-weather';

export function describe(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear sky', icon: 'sun' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'cloudSun' };
  if (code === 3) return { label: 'Cloudy', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Foggy', icon: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'rain' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'rain' };
  if (code >= 85 && code <= 86) return { label: 'Snow showers', icon: 'snow' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'storm' };
  return { label: 'Cloudy', icon: 'cloud' };
}

async function fetchWeather(loc: Location): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=1`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Weather unavailable');
  const j = await r.json();
  return {
    temp: Math.round(j.current.temperature_2m),
    code: j.current.weather_code,
    max: Math.round(j.daily.temperature_2m_max[0]),
    min: Math.round(j.daily.temperature_2m_min[0]),
    rainChance: j.daily.precipitation_probability_max?.[0] ?? 0,
    fetchedAt: Date.now(),
  };
}

export async function searchPlaces(q: string): Promise<Location[]> {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('Search failed');
  const j = await r.json();
  return (j.results ?? []).map((p: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
    name: [p.name, p.admin1, p.country].filter(Boolean).join(', '),
    lat: p.latitude,
    lon: p.longitude,
  }));
}

/** Weather for the saved location, refreshed every 30 minutes and cached across restarts. */
export function useWeather(loc: Location | null): { data: Weather | null; error: boolean } {
  const [data, setData] = useState<Weather | null>(() => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
      return c && loc && c.key === `${loc.lat},${loc.lon}` ? c.data : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loc) return;
    let alive = true;
    const load = () =>
      fetchWeather(loc)
        .then((w) => {
          if (!alive) return;
          setData(w);
          setError(false);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ key: `${loc.lat},${loc.lon}`, data: w }));
          } catch {
            /* storage full: ignore */
          }
        })
        .catch(() => alive && setError(true));
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [loc]);

  return { data, error };
}

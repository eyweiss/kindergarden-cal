import type { NextApiRequest, NextApiResponse } from "next";

const LAT = 32.08;
const LON = 34.78;
const CACHE_MS = 30 * 60 * 1000;

function wmoEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "🌤️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

let cache: { data: { temp: number; emoji: string }; ts: number } | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return res.json(cache.data);
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Asia%2FJerusalem`;
    const r = await fetch(url);
    const json = await r.json();
    const data = {
      temp: Math.round(json.current.temperature_2m),
      emoji: wmoEmoji(json.current.weather_code),
    };
    cache = { data, ts: Date.now() };
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate");
    res.json(data);
  } catch {
    res.status(500).json({ error: "weather unavailable" });
  }
}

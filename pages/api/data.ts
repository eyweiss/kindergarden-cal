import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), ".data", "gan-data.json");
const EMPTY = { calendar: {}, notes: [], stars: [], reminders: {} };
const REDIS_KEY = "gan-data";

function readLocal() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return EMPTY; }
}

function writeLocal(data: object) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data), "utf8");
}

function migrateNotes(data: any) {
  if (typeof data.notes === "string") {
    data.notes = data.notes
      ? [{ id: Date.now(), text: data.notes, date: new Date().toLocaleDateString("he-IL") }]
      : [];
  }
  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const useRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const onVercel = !!process.env.VERCEL;

  if (!useRedis && onVercel) {
    const msg = "Storage not configured: add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel → Storage → Upstash Redis";
    if (req.method === "GET") return res.status(200).json({ ...EMPTY, error: msg });
    return res.status(503).json({ ok: false, error: msg });
  }

  if (req.method === "GET") {
    if (!useRedis) return res.status(200).json(migrateNotes(readLocal()));
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      const data = (await redis.get<object>(REDIS_KEY)) ?? EMPTY;
      return res.status(200).json(migrateNotes(data));
    } catch (e: any) {
      return res.status(200).json({ ...EMPTY, error: e.message });
    }
  }

  if (req.method === "POST") {
    const { calendar, notes, stars, reminders } = req.body;
    if (!useRedis) {
      try {
        writeLocal({ calendar, notes, stars, reminders });
        return res.status(200).json({ ok: true });
      } catch (e: any) {
        return res.status(500).json({ ok: false, error: e.message });
      }
    }
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await redis.set(REDIS_KEY, { calendar, notes, stars, reminders });
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  res.status(405).end();
}

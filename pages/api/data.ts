import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), ".data", "gan-data.json");
const EMPTY = { calendar: {}, notes: [], stars: [], reminders: {} };
const BLOB_FILE = "gan-data.json";
// A Blob store is created as either public or private, and calls must match it
// or the API rejects them. Set BLOB_ACCESS=public for a store created as public.
const BLOB_ACCESS: "public" | "private" =
  process.env.BLOB_ACCESS === "public" ? "public" : "private";

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

// Every Blob call passes `token` explicitly. The SDK checks options.token first
// and only falls back to OIDC auth when it's absent — without this, the presence
// of BLOB_STORE_ID makes it choose OIDC, which isn't enabled for `development`.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  const onVercel = !!process.env.VERCEL;

  if (!hasBlobToken && onVercel) {
    const msg = "Storage not configured: connect Vercel Blob in Vercel → Storage";
    if (req.method === "GET") return res.status(200).json({ ...EMPTY, error: msg });
    return res.status(503).json({ ok: false, error: msg });
  }

  if (req.method === "GET") {
    if (!hasBlobToken) return res.status(200).json(migrateNotes(readLocal()));
    try {
      const { get } = await import("@vercel/blob");
      // useCache: false reads from origin storage, so the parents' board never
      // serves a stale copy of what the teacher just saved.
      const result = await get(BLOB_FILE, {
        access: BLOB_ACCESS,
        useCache: false,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (!result || result.statusCode !== 200) return res.status(200).json(EMPTY);
      const data = await new Response(result.stream).json();
      return res.status(200).json(migrateNotes(data));
    } catch (e: any) {
      return res.status(200).json({ ...EMPTY, error: e.message });
    }
  }

  if (req.method === "POST") {
    const { calendar, notes, stars, reminders } = req.body;
    if (!hasBlobToken) {
      try {
        writeLocal({ calendar, notes, stars, reminders });
        return res.status(200).json({ ok: true });
      } catch (e: any) {
        return res.status(500).json({ ok: false, error: e.message });
      }
    }
    try {
      const { put } = await import("@vercel/blob");
      await put(BLOB_FILE, JSON.stringify({ calendar, notes, stars, reminders }), {
        access: BLOB_ACCESS,
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  res.status(405).end();
}

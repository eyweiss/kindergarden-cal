import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), ".data", "gan-data.json");
const EMPTY = { calendar: {}, notes: [], stars: [], reminders: {} };

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
  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

  if (req.method === "GET") {
    if (!useBlob) return res.status(200).json(migrateNotes(readLocal()));

    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "gan-data.json", token: process.env.BLOB_READ_WRITE_TOKEN! });
      if (!blobs.length) return res.status(200).json(EMPTY);
      const data = await fetch(blobs[0].url + "?t=" + Date.now()).then(r => r.json());
      return res.status(200).json(migrateNotes(data));
    } catch (e: any) {
      return res.status(200).json({ ...EMPTY, error: e.message });
    }
  }

  if (req.method === "POST") {
    const { calendar, notes, stars, reminders } = req.body;

    if (!useBlob) {
      try {
        writeLocal({ calendar, notes, stars, reminders });
        return res.status(200).json({ ok: true });
      } catch (e: any) {
        return res.status(500).json({ ok: false, error: e.message });
      }
    }

    try {
      const { put } = await import("@vercel/blob");
      await put("gan-data.json", JSON.stringify({ calendar, notes, stars, reminders }), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN!,
      });
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  res.status(405).end();
}

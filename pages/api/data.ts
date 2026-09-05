import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), ".data", "gan-data.json");
const EMPTY = { calendar: {}, notes: [], stars: [], reminders: {} };
const BLOB_FILE = "gan-data.json";

// A Blob store is created as either public or private, and every call must
// match it or the API rejects the call. Rather than hardcode a guess, learn the
// mode from the store itself and remember it for the life of this instance.
type Access = "public" | "private";
let blobAccess: Access = process.env.BLOB_ACCESS === "public" ? "public" : "private";
const otherAccess = (a: Access): Access => (a === "public" ? "private" : "public");
const isAccessMismatch = (e: any) =>
  /Cannot use (public|private) access on a (public|private) store/.test(e?.message ?? "");

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
      const { head, get, BlobNotFoundError } = await import("@vercel/blob");
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      // head() needs no access mode, and the URL it returns reveals the store's.
      let meta;
      try { meta = await head(BLOB_FILE, { token }); }
      catch (e) {
        if (e instanceof BlobNotFoundError) return res.status(200).json(EMPTY);
        throw e;
      }
      blobAccess = meta.url.includes(".private.") ? "private" : "public";
      // useCache: false reads from origin storage, so the parents' board never
      // serves a stale copy of what the teacher just saved.
      const result = await get(BLOB_FILE, { access: blobAccess, useCache: false, token });
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
      const body = JSON.stringify({ calendar, notes, stars, reminders });
      const opts = {
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      };
      try {
        await put(BLOB_FILE, body, { access: blobAccess, ...opts });
      } catch (e) {
        if (!isAccessMismatch(e)) throw e;
        // The API just told us the store's real mode; remember it and retry once.
        blobAccess = otherAccess(blobAccess);
        await put(BLOB_FILE, body, { access: blobAccess, ...opts });
      }
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  res.status(405).end();
}

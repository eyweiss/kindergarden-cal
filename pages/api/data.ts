import type { NextApiRequest, NextApiResponse } from "next";
import { put, list } from "@vercel/blob";

const FILENAME = "gan-data.json";
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const { blobs } = await list({ prefix: FILENAME, token: TOKEN });
      if (!blobs.length) return res.status(200).json({ calendar: {}, notes: [], stars: [] });
      const response = await fetch(blobs[0].url + "?t=" + Date.now());
      const data = await response.json();
      // migrate old string notes to array
      if (typeof data.notes === "string") {
        data.notes = data.notes ? [{ id: Date.now(), text: data.notes, date: new Date().toLocaleDateString("he-IL") }] : [];
      }
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(200).json({ calendar: {}, notes: [], stars: [], error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { calendar, notes, stars } = req.body;
      await put(FILENAME, JSON.stringify({ calendar, notes, stars }), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: TOKEN,
      });
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  res.status(405).end();
}

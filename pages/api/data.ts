import type { NextApiRequest, NextApiResponse } from "next";
import { put, list } from "@vercel/blob";

const FILENAME = "gan-data.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const { blobs } = await list({ prefix: FILENAME });
      if (!blobs.length) return res.status(200).json({ calendar: {}, notes: "" });
      const response = await fetch(blobs[0].url + "?t=" + Date.now());
      const data = await response.json();
      return res.status(200).json(data);
    } catch (e: any) {
      console.error("GET error:", e);
      return res.status(200).json({ calendar: {}, notes: "", error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { calendar, notes } = req.body;
      const blob = await put(FILENAME, JSON.stringify({ calendar, notes }), {
        access: "public",
        addRandomSuffix: false,
      });
      return res.status(200).json({ ok: true, url: blob.url });
    } catch (e: any) {
      console.error("POST error:", e);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  res.status(405).end();
}

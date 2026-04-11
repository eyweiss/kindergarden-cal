import type { NextApiRequest, NextApiResponse } from "next";
import { kv } from "@vercel/kv";

const KEY = "gan_weekly_data";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const data = await kv.get(KEY);
      res.status(200).json(data || { calendar: {}, notes: "" });
    } catch {
      res.status(200).json({ calendar: {}, notes: "" });
    }
  } else if (req.method === "POST") {
    try {
      const { calendar, notes } = req.body;
      await kv.set(KEY, { calendar, notes });
      res.status(200).json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).end();
  }
}

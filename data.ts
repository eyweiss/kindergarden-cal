import type { NextApiRequest, NextApiResponse } from "next";
import { put, head, get } from "@vercel/blob";

const BLOB_KEY = "gan-weekly-data.json";

async function readData() {
  try {
    // Find the blob by listing with prefix
    const { blobs } = await (await import("@vercel/blob")).list({ prefix: BLOB_KEY });
    if (!blobs.length) return { calendar: {}, notes: "" };
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return { calendar: {}, notes: "" };
  }
}

async function writeData(data: object) {
  await put(BLOB_KEY, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const data = await readData();
    res.status(200).json(data);
  } else if (req.method === "POST") {
    const { calendar, notes } = req.body;
    await writeData({ calendar, notes });
    res.status(200).json({ ok: true });
  } else {
    res.status(405).end();
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { texts, lang } = req.body as { texts?: string[]; lang?: string };
  if (!Array.isArray(texts) || texts.length === 0 || !lang)
    return res.status(400).json({ error: "Missing texts or lang" });

  const langName = lang === "ru" ? "Russian" : "English";

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Translate these Hebrew kindergarten activity texts to ${langName}. Return ONLY a JSON array of strings in the same order, no explanation.\n${JSON.stringify(texts)}`,
      }],
    });

    const block = message.content[0];
    if (block.type !== "text") return res.status(500).json({ error: "Unexpected response" });

    const raw = block.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    return res.status(200).json({ translated: JSON.parse(raw) });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Translation failed" });
  }
}

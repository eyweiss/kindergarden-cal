import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a Hebrew kindergarten schedule parser. Parse a Hebrew WhatsApp weekly schedule message and return ONLY a valid JSON object with no markdown or explanation.

The JSON must have:
- Keys "sun", "mon", "tue", "wed", "thu", "fri": each an array of objects with:
  - "text": string — the event or activity in Hebrew, as written in the message
  - "important": boolean — true when the item requires parent action: things to bring, timing warnings, dietary or food notes, clothing requirements, or direct reminders to parents
- Key "stars": array of strings — names of children mentioned as כוכב or כוכבת השבוע

Rules:
- Omit a day key entirely if the message has no content for that day
- "important": true for anything requiring parent preparation or attention
- Return ONLY the raw JSON object`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { text } = req.body as { text?: string };
  if (!text?.trim()) return res.status(400).json({ error: "Missing text" });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });

  const block = message.content[0];
  if (block.type !== "text") return res.status(500).json({ error: "Unexpected response type" });

  const raw = block.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
  try {
    return res.status(200).json(JSON.parse(raw));
  } catch {
    return res.status(500).json({ error: "Failed to parse Claude response", raw });
  }
}

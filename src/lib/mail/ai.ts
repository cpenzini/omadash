import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

type ChatOk = { ok: true; text: string };
type ChatErr = { ok: false; error: string };

async function chat(system: string, user: string, maxTokens: number): Promise<ChatOk | ChatErr> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "AI is not available" };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) return { ok: false, error: `xAI API error ${res.status}` };
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return { ok: true, text: body.choices?.[0]?.message?.content?.trim() ?? "" };
}

export const draftWithGrok = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { to: string; subject: string; notes: string }) => input)
  .handler(async ({ data }) => {
    return chat(
      "You write concise, human email drafts for a fast keyboard-first mail client. No subject line, no greeting fluff unless the notes ask for it. Plain text only. 80–140 words unless the notes demand shorter.",
      `To: ${data.to || "(unknown)"}\nSubject: ${data.subject || "(none)"}\nNotes:\n${data.notes || "Write a short, useful reply."}`,
      400,
    );
  });

export const rewriteDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { body: string; tone: "shorter" | "warmer" }) => input)
  .handler(async ({ data }) => {
    if (!data.body.trim()) return { ok: false as const, error: "Nothing to rewrite" };
    const system =
      data.tone === "shorter"
        ? "Rewrite this email shorter. Keep the meaning and any asks. Plain text. No subject line. 40–90 words."
        : "Rewrite this email warmer and more human, still concise. Plain text. No emoji. No subject line.";
    return chat(system, data.body.slice(0, 2000), 300);
  });

export const summarizeThread = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { subject: string; messages: { from: string; body: string }[] }) => input)
  .handler(async ({ data }) => {
    const lines = data.messages.slice(-8).map((m) => `${m.from}:\n${m.body.slice(0, 500)}`);
    return chat(
      "Summarize this email thread for a keyboard-first mail client. 4–6 short lines: who is involved, what they want, decisions, open asks. No greeting. No markdown headings. Plain text.",
      `Subject: ${data.subject}\n\n${lines.join("\n\n")}`,
      220,
    );
  });

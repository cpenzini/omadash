import { createServerFn } from "@tanstack/react-start";

export const draftWithGrok = createServerFn({ method: "POST" })
  .validator((input: { to: string; subject: string; notes: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not available" };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "You write concise, human email drafts for a fast keyboard-first mail client. No subject line, no greeting fluff unless the notes ask for it. Plain text only. 80–140 words unless the notes demand shorter.",
          },
          {
            role: "user",
            content: `To: ${data.to || "(unknown)"}\nSubject: ${data.subject || "(none)"}\nNotes:\n${data.notes || "Write a short, useful reply."}`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI API error ${res.status}` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { ok: true as const, text: body.choices?.[0]?.message?.content?.trim() ?? "" };
  });

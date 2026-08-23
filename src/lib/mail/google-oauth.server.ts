/** HMAC for Google Calendar OAuth state. Server-only — do not import from client. */

function oauthSecret(): string {
  return process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "omadash-preview-envelope";
}

export async function signOAuthState(userId: string): Promise<string> {
  const { createHmac } = await import("node:crypto");
  const ts = Date.now().toString(36);
  const payload = `${userId}.${ts}`;
  const mac = createHmac("sha256", oauthSecret()).update(payload).digest("hex").slice(0, 24);
  return `${mac}.${payload}`;
}

export async function readOAuthState(state: string): Promise<string> {
  const { createHmac } = await import("node:crypto");
  const [mac, userId, ts] = state.split(".");
  if (!mac || !userId || !ts) throw new Error("Bad OAuth state");
  const expect = createHmac("sha256", oauthSecret()).update(`${userId}.${ts}`).digest("hex").slice(0, 24);
  if (expect !== mac) throw new Error("Bad OAuth state");
  const age = Date.now() - parseInt(ts, 36);
  if (age > 15 * 60 * 1000) throw new Error("OAuth state expired");
  return userId;
}

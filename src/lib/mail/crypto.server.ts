import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "omadash-preview-envelope";
  return createHash("sha256").update(secret).digest();
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}.${cipher.getAuthTag().toString("hex")}.${enc.toString("hex")}`;
}

export function openSecret(packed: string): string {
  const [ivH, tagH, dataH] = packed.split(".");
  if (!ivH || !tagH || !dataH) throw new Error("Corrupt mailbox secret");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivH, "hex"));
  decipher.setAuthTag(Buffer.from(tagH, "hex"));
  const out = Buffer.concat([decipher.update(Buffer.from(dataH, "hex")), decipher.final()]);
  return out.toString("utf8");
}

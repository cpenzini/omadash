/**
 * IMAP/SMTP presets. Add a host here and the connect overlay lists it.
 * See docs/EXTENDING.md.
 */
export type MailProviderId = "gmail" | "fastmail" | "icloud" | "imap";

export interface MailProviderPreset {
  id: MailProviderId;
  label: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  hint: string;
}

export const MAIL_PRESETS: MailProviderPreset[] = [
  {
    id: "gmail",
    label: "Gmail",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    hint: "Continue with Google for inbox and calendar. An app password still works if you prefer.",
  },
  {
    id: "fastmail",
    label: "Fastmail",
    imapHost: "imap.fastmail.com",
    imapPort: 993,
    smtpHost: "smtp.fastmail.com",
    smtpPort: 587,
    hint: "Use an app password from Fastmail → Privacy & Security.",
  },
  {
    id: "icloud",
    label: "iCloud",
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    hint: "Apple requires an app-specific password. Enable 2FA first.",
  },
  {
    id: "imap",
    label: "Other IMAP",
    imapHost: "",
    imapPort: 993,
    smtpHost: "",
    smtpPort: 587,
    hint: "Works with most hosts that still allow IMAP + SMTP login.",
  },
];

export function presetById(id: MailProviderId): MailProviderPreset {
  return MAIL_PRESETS.find((p) => p.id === id) ?? MAIL_PRESETS[3]!;
}

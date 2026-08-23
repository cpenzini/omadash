export type CalProviderId = "google" | "fastmail" | "icloud" | "nextcloud" | "caldav" | "ics";

export const CAL_COLORS = [
  "unread",
  "success",
  "warn",
  "accent",
  "danger",
  "avatar-1",
  "avatar-3",
  "avatar-4",
] as const;

export type CalColorId = (typeof CAL_COLORS)[number];

export function isCalColor(value: string): value is CalColorId {
  return (CAL_COLORS as readonly string[]).includes(value);
}

export function nextCalColor(used: string[]): CalColorId {
  const hit = CAL_COLORS.find((c) => !used.includes(c));
  return hit ?? CAL_COLORS[used.length % CAL_COLORS.length]!;
}

export function mailboxTint(slot: number): CalColorId {
  return Number(slot) === 2 ? "success" : "unread";
}

export interface CalProviderPreset {
  id: CalProviderId;
  label: string;
  kind: "google" | "caldav" | "ics";
  caldavUrl: string;
  hint: string;
  color: CalColorId;
}

export const CAL_PRESETS: CalProviderPreset[] = [
  {
    id: "google",
    label: "Google",
    kind: "google",
    caldavUrl: "",
    hint: "Continue with Google attaches Gmail and Calendar together. Otherwise paste the secret iCal address from Google Calendar → Settings → Integrate calendar.",
    color: "warn",
  },
  {
    id: "fastmail",
    label: "Fastmail",
    kind: "caldav",
    caldavUrl: "https://caldav.fastmail.com",
    hint: "App password from Fastmail → Privacy & Security. Two-way CalDAV.",
    color: "accent",
  },
  {
    id: "icloud",
    label: "iCloud",
    kind: "caldav",
    caldavUrl: "https://caldav.icloud.com",
    hint: "Apple ID plus an app-specific password. Enable 2FA first.",
    color: "unread",
  },
  {
    id: "nextcloud",
    label: "Nextcloud",
    kind: "caldav",
    caldavUrl: "",
    hint: "https://cloud.example.com/remote.php/dav. Username and app password.",
    color: "success",
  },
  {
    id: "caldav",
    label: "CalDAV",
    kind: "caldav",
    caldavUrl: "",
    hint: "Any CalDAV host: Fastmail, mailbox.org, a university DAV, a NAS.",
    color: "accent",
  },
  {
    id: "ics",
    label: "ICS feed",
    kind: "ics",
    caldavUrl: "",
    hint: "Read-only. Subscribe to a public or secret .ics URL.",
    color: "unread",
  },
];

export function calPresetById(id: CalProviderId): CalProviderPreset {
  return CAL_PRESETS.find((p) => p.id === id) ?? CAL_PRESETS[4]!;
}

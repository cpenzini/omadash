export type CalProviderId = "google" | "fastmail" | "icloud" | "nextcloud" | "caldav" | "ics";

export interface CalProviderPreset {
  id: CalProviderId;
  label: string;
  kind: "google" | "caldav" | "ics";
  caldavUrl: string;
  hint: string;
  color: "unread" | "success" | "warn" | "accent" | "danger";
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

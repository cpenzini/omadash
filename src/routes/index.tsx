import { createFileRoute } from "@tanstack/react-router";
import { MailApp } from "@/components/mail/mail-app";

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>) => ({
    connect: raw.connect === "1" || raw.connect === true ? true : undefined,
    compose: raw.compose === "1" || raw.compose === true ? true : undefined,
    omarchy: raw.omarchy === "1" || raw.omarchy === true ? true : undefined,
    calendar: raw.calendar === "1" || raw.calendar === 1 || raw.calendar === true ? true : undefined,
    google: raw.google === "1" || raw.google === true ? true : undefined,
    linked: raw.linked === "1" || raw.linked === true ? true : undefined,
    linkerr: raw.linkerr === "1" || raw.linkerr === true ? true : undefined,
    to: typeof raw.to === "string" ? raw.to : undefined,
  }),
  component: Home,
});

function Home() {
  return <MailApp />;
}

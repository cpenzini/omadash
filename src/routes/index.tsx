import { createFileRoute } from "@tanstack/react-router";
import { MailApp } from "@/components/mail/mail-app";

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>) => ({
    connect: raw.connect === "1" || raw.connect === true ? true : undefined,
    compose: raw.compose === "1" || raw.compose === true ? true : undefined,
    omarchy: raw.omarchy === "1" || raw.omarchy === true ? true : undefined,
    to: typeof raw.to === "string" ? raw.to : undefined,
  }),
  component: Home,
});

function Home() {
  return <MailApp />;
}

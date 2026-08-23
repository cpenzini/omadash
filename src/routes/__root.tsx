import { useEffect, useLayoutEffect } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app";
import { THEME_BOOT, useThemeStore } from "@/lib/theme";
import { usePrefsStore } from "@/lib/mail/prefs";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#0b0c0e" },
      {
        name: "description",
        content: APP_DESCRIPTION,
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
      },
    ],
  }),
  component: RootShell,
});

function RootShell() {
  const hydrate = useThemeStore((s) => s.hydrate);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);
  const id = useThemeStore((s) => s.id);

  useLayoutEffect(() => {
    hydrate();
    hydratePrefs();
  }, [hydrate, hydratePrefs]);

  useEffect(() => {
    if (id !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => hydrate();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [id, hydrate]);

  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
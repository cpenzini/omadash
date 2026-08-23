import { createFileRoute } from "@tanstack/react-router";
import { finishGoogleOAuth } from "@/lib/mail/calendar-sync";
import { readOAuthState } from "@/lib/mail/google-oauth.server";

export const Route = createFileRoute("/api/calendar/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        if (err || !code || !state) {
          return Response.redirect(`${origin}/?linkerr=1`);
        }
        try {
          const userId = await readOAuthState(state);
          await finishGoogleOAuth({
            userId,
            code,
            redirectUri: `${origin}/api/calendar/google`,
          });
        } catch {
          return Response.redirect(`${origin}/?linkerr=1`);
        }
        return Response.redirect(`${origin}/?linked=1`);
      },
    },
  },
});

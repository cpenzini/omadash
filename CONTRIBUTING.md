# Contributing to Omadash

Omadash exists so people on Omarchy can own a fast mail client. The useful patches are the ones you needed this morning.

## Ground rules

- Keep it keyboard-first. A new feature without a key is half-done.
- Do not add telemetry, growth popups, or remote fonts you cannot name.
- IMAP writes are sacred. Optimistic UI must still undo and still hit the server.
- Match the current tone: dense, quiet, no decoration for its own sake.
- One idea per pull request.

## First patches we want

These are the smallest useful forks. Each is documented in [docs/EXTENDING.md](docs/EXTENDING.md).

1. A new IMAP preset (Proton, mailbox.org, a university host).
2. An Omarchy theme that already lives on the desktop.
3. A snippet you actually type.
4. A key that is missing from `?`.
5. HTML sanitizer cases that still leak a tracker.
6. A calendar pin for a thread that already has a time in the body.
7. A CalDAV preset (mailbox.org, a university DAV).
8. A default inbox rule (a domain that always belongs in Other).

## How to work

```bash
npm install
npm run dev
npm run typecheck
```

Hit `?` and use the demo inbox. Connect a throwaway mailbox before you touch `imap.server.ts`. Train a thread with `Shift+O` / `Shift+I` before you edit `rules.ts`.

## Code shape

- Actions live in `src/lib/mail/store.ts`. Keys live in `src/lib/mail/hotkeys.ts`. If you add one, add the other, then add a row to `shortcut-sheet.tsx`.
- Split rules live in `src/lib/mail/rules.ts`. First match wins; do not rewrite stored `focused`.
- Server functions in `mailbox.ts` always go through `authMiddleware` and query by `context.userId`. Never a client-sent user id.
- Themes are CSS variables, not one-off class names.
- Do not introduce a plugin runtime. Edit the files.

## Commit style

Present tense, what changed and why.

```
Add Proton Mail IMAP preset
Block cid: images unless Show images is on
```

## License

By contributing you agree the patch ships under the MIT License in `LICENSE`.

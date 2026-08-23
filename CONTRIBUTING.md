# Contributing to Omadash

Omadash exists so people on Omarchy can own a fast mail and calendar client. The useful patches are the ones you needed this morning.

We ship a compiled Linux binary and this source. A change lands when it is in `main` and, for native, when a release tarball is cut.

## Ground rules

- Keep it keyboard-first. A new feature without a key is half-done.
- Do not add telemetry, growth popups, or remote fonts you cannot name.
- IMAP writes are sacred. Optimistic UI must still undo and still hit the server.
- Match the current tone: dense, quiet, no decoration for its own sake.
- One idea per pull request.
- Native first launch may seed a demo mailbox so keys work offline. The web client stays empty until connect. Do not mix those policies.

## First patches we want

Each is documented in [docs/EXTENDING.md](docs/EXTENDING.md).

1. A new IMAP preset (Proton, mailbox.org, a university host) — native `native/lib/src/imap.dart` **and** web `src/lib/mail/presets.ts`.
2. An Omarchy theme that already lives on the desktop (web CSS tokens; native already follows `colors.toml`).
3. A snippet you actually type (web compose).
4. A key that is missing from `?`.
5. HTML sanitizer cases that still leak a tracker (web).
6. CalDAV in the native app (the web client already writes back).
7. A default inbox rule (a domain that always belongs in Other).

## How to work

**Native**

```bash
cd native
./tool/bootstrap.sh
flutter test
flutter analyze
```

Connect a throwaway mailbox with `G` then `P` before you touch `imap.dart`. Hit `?` after.

**Web**

```bash
npm install
npm run dev
npm run test:unit
npm run typecheck
```

Hit `?` after connecting a throwaway mailbox — the web client stays empty until you do. Connect before you touch `imap.server.ts`. Train a thread with `Shift+O` / `Shift+I` before you edit `rules.ts`. File a date with `N` before you edit `dates.ts`.

## Code shape

**Native (`native/`)**

- State: `lib/src/store.dart`. Keys: `lib/src/keys.dart`. IMAP/SMTP: `lib/src/imap.dart`. Shell: `lib/src/widgets/shell.dart`.
- If you add a key, add the action, then a row on the shortcut overlay in `shell.dart`.
- Credentials go through `flutter_secure_storage`. Never `print` a password.

**Web (`src/`)**

- Actions live in `src/lib/mail/store.ts`. Keys live in `src/lib/mail/hotkeys.ts`. If you add one, add the other, then add a row to `shortcut-sheet.tsx`.
- Split rules live in `src/lib/mail/rules.ts`. First match wins; do not rewrite stored `focused`.
- Layout and settings live in `src/lib/mail/prefs.ts` and `src/components/mail/settings.tsx`.
- Server functions in `mailbox.ts` always go through `authMiddleware` and query by `context.userId`. Never a client-sent user id.
- Themes are CSS variables, not one-off class names.
- Do not introduce a plugin runtime. Edit the files.

## Commit style

Present tense, what changed and why.

```
Add Proton Mail IMAP preset
Block cid: images unless Show images is on
```

## Release

Maintainers tag `vX.Y.Z` on `main`. GitHub Actions compiles the Linux bundle and attaches `omadash-X.Y.Z-linux-x64.tar.gz` to the GitHub release. Bump `native/pubspec.yaml`, `package.json`, and `src/lib/app.ts` together.

## License

By contributing you agree the patch ships under the MIT License in `LICENSE`.

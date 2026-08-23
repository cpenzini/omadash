# Omadash

Keyboard-first mail and calendar for [Omarchy](https://omarchy.org). Native GTK. MIT. Free forever.

**Version 0.2.0** · [Changelog](CHANGELOG.md) · [Install](docs/INSTALL.md) · [Keys](docs/KEYS.md) · [Releases](https://github.com/cpenzini/omadash/releases/latest)

Omadash is one app for the inbox and the day. Mail is a dense list — one line per thread — and Enter opens the message. Calendar is a full window. You move both with the same keys. The mouse is a fallback, not the design.

We **only distribute the compiled Linux binary and this source**. You do not need git, npm, Flutter, or a terminal to use it.

## Get the compiled app

1. Download **`omadash-0.2.0-linux-x64.tar.gz`** from the [latest release](https://github.com/cpenzini/omadash/releases/latest).
2. Install it:

```bash
tar -xzf omadash-0.2.0-linux-x64.tar.gz
cd omadash-0.2.0-linux-x64
./install.sh
```

That copies the bundle to `~/.local/lib/omadash`, puts `omadash` on your path, and writes a desktop entry.

3. Bind Super + M in Hyprland:

```
bindd = SUPER, M, Omadash, exec, omadash
```

4. Open it. First launch is Alex Rivera’s demo mailbox so the keys work offline. Connect a real box with `G` then `P`.

Gmail, Fastmail, iCloud, or generic IMAP. Use an [app password](https://myaccount.google.com/apppasswords), not your account password. Credentials stay on the machine (`libsecret`). Theme follows `~/.local/state/omarchy/current/theme/colors.toml`.

Step-by-step, including checksums and uninstall: [docs/INSTALL.md](docs/INSTALL.md).

## Why it exists

Mail and calendar became two products that watch you. Clients got slower so they could sell AI, read receipts you did not ask for, a workspace you do not control, and a calendar that only talks to itself.

Omadash takes the other side. If a thing happens more than twice a day, it has a key. Your mailbox stays IMAP and SMTP. Done writes `\Seen` and moves the message. Star and unread write back. No Electron. No browser chrome. No telemetry.

The source is small enough to hold in your head: one store, one keymap, one IMAP module.

## Mail (native)

Superhuman keys on a GTK window.

- `J` / `K` walk the list. Enter / `O` opens. Esc goes back.
- `E` done (archive). `#` trash. `S` star. `Z` unread. `U` undo.
- `C` compose. `R` / `Shift+R` reply / reply all. `F` forward. Ctrl+Enter sends.
- Inbox splits Focused / Other (`Tab`). Waiting, drafts, sent, snoozed, done, trash via `G` then a letter.
- Ctrl+K or `/` is the command palette.
- Live IMAP via [`enough_mail`](https://pub.dev/packages/enough_mail). SMTP for send.

## Calendar (native)

`3` or `G` then `C`. A day list of events. First launch has a local week so the pane is not empty; it does not yet speak CalDAV. The web client does — see below.

## Keys

Hit `?` in the app. Full map: [docs/KEYS.md](docs/KEYS.md).

| Key | Action |
| --- | --- |
| `J` / `K` | Next / previous thread |
| `Enter` / `O` | Open thread |
| `E` | Done |
| `#` | Trash |
| `C` | Compose |
| `R` / `Shift+R` | Reply / reply all |
| `S` | Star |
| `U` | Undo |
| `Z` | Toggle unread |
| `Ctrl+K` / `/` | Command palette |
| `Ctrl+Enter` | Send |
| `G` then `I` / `S` / `T` / `E` / `#` | Inbox / Starred / Sent / Done / Trash |
| `G` then `C` / `3` | Calendar |
| `G` then `P` | Connect mailbox |
| `?` | Keyboard reference |
| `Esc` | Close overlay / back |

## What we ship

| Artifact | What it is |
| --- | --- |
| [Release tarball](https://github.com/cpenzini/omadash/releases/latest) | Compiled GTK binary + `lib/` + `install.sh`. This is how you run Omadash. |
| This repository | MIT source for the native app (`native/`) and the web client (`src/`). |

We do not ship `node_modules`, Flutter SDK caches, or unpublished sandbox files. GitHub’s automatic source zip on each release is the same tree as `main`.

## Web client

The same mailbox UI runs in a browser (`src/`). It is how the in-browser preview works, and it has the fuller calendar (CalDAV, Google, ICS), split-inbox rules, send later, and sign-in. Browsers cannot speak IMAP sockets, so live mail in the web client goes through the server. **The native binary talks to your mail host directly.** Prefer the compiled app on Omarchy.

PWA install (Chromium / phone) still exists in the web client if you want a hosted inbox. It is not the Linux product.

## From source

Only if you want to change Omadash, not just use it. Users should [download the binary](#get-the-compiled-app).

**Native Linux**

```bash
git clone https://github.com/cpenzini/omadash.git
cd omadash/native
chmod +x tool/bootstrap.sh
./tool/bootstrap.sh
flutter test
flutter build linux --release --no-tree-shake-icons
./tool/package.sh
```

Needs Flutter stable, clang, cmake, ninja, GTK 3, libsecret. On Omarchy: `pacman` those, then `mise plugin add flutter && mise use -g flutter@latest`. Details: [native/README.md](native/README.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**Web**

```bash
git clone https://github.com/cpenzini/omadash.git
cd omadash
npm install
npm test
npm run typecheck
npm run build
```

## Stack

- **Native:** Flutter 3, [`flutter_omarchy`](https://pub.dev/packages/flutter_omarchy), `enough_mail`, `flutter_secure_storage` / libsecret, `shared_preferences`.
- **Web:** React 19, TanStack Start, Zustand, Tailwind v4, IMAPFlow, Nodemailer, tsdav, Better Auth, Postgres or PGLite.

How to add a provider, a theme, a key, or a snippet: [docs/EXTENDING.md](docs/EXTENDING.md). Patches we want: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. Copy it, ship it, sell a hosted version if you want — keep the license notice. Mail should not be a subscription to your own inbox.

Built for people on Omarchy who wanted Superhuman speed without Superhuman terms. Named Omadash because it sits on the desktop and gets you to zero.

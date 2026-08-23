# Changelog

## 0.2.0 — 2026-08-23

First compiled native release. Omadash is a GTK Linux binary. We distribute that binary and the MIT source — nothing else.

**Native Linux (`native/`)**

- Flutter + [`flutter_omarchy`](https://pub.dev/packages/flutter_omarchy). No Electron, no browser chrome.
- Theme follows `~/.local/state/omarchy/current/theme/colors.toml` (Tokyo Night fallback).
- Superhuman keys on the home row. Command palette (`Ctrl+K` / `/`). Keyboard sheet (`?`).
- Live IMAP/SMTP via `enough_mail` (Gmail, Fastmail, iCloud, generic). App password, stored in libsecret.
- Demo mailbox (`alex@omarchy.dev`) so the keys work offline on first launch.
- `tool/bootstrap.sh` creates the Linux runner and strips the GTK title bar. `--install` writes a desktop entry.
- `packaging/install.sh` installs a release tarball to `~/.local`.
- GitHub Actions compiles `omadash-<version>-linux-x64.tar.gz` on every `v*` tag.

**Distribution**

- README leads with the compiled binary.
- Docs: install, keys, architecture, extending, contributing.
- `isAttachment` compile break against `enough_mail` 2.1.7 fixed; unseen flags now call `uidMarkUnseen`.

The web client from 0.1.0 is unchanged as a playable mailbox UI. CalDAV / Google calendar two-way still lives there. Native calendar is a local day list in this cut.

## 0.1.0 — 2026-08-23

First public web release. Mail and calendar on the same keys. Empty until you connect.

**Empty until you connect**

- No sample inbox, no sample week. Connect a mailbox to see mail; connect a calendar to see events.
- Two mailboxes on `1` / `2`. Calendar on `3`. `` ` `` cycles mailbox / mailbox / calendar.
- As many calendar accounts as you attach, each with its own color. Click the dot to change it.
- New events pick a destination calendar.

**Mail that writes back**

- Keyboard-first two-pane client (compact list, Enter to open). Three panes from Settings (`,`) or `\`.
- IMAP/SMTP for Gmail, Fastmail, iCloud, generic hosts; two-way archive / star / unread.
- HTML mail, blocked remote images, tracking pixels stripped. The reading pane reflows.
- Split inbox with editable rules. Train from a thread: `Shift+I` Focused, `Shift+O` Other.
- Done, trash, snooze, mute, labels, bulk select, waiting, undo.
- Live IMAP peek while the tab is open. `⌘K` searches every mailbox.
- Send holds 8 seconds for `U`. Follow-up bounce and send later.
- Compose attachments (paperclip or drop, 8 files / 8 MB). To and Cc complete from people you've mailed.
- Thread summarize (`Y`). Rewrite with Grok: shorter / warmer.
- File a date from a thread onto a calendar (`N`). Detected times become chips in the thread.

**Calendar on equal terms**

- Full window next to mail. Day, week, work week (`F`), month, agenda (`A`).
- Timed grid, overlapping events, now-line, all-day row, titles in the month.
- Second time zone (`Z`). Desktop ping 10 minutes before an event.
- CalDAV two-way: Fastmail, iCloud, Nextcloud, generic (`P` from the calendar).
- Google Calendar two-way when OAuth is on the host; otherwise a secret iCal URL (read-only).
- Continue with Google asks for Gmail and Calendar after identity, then attaches both.
- ICS feed subscribe. Add and delete on writable calendars. Sync (`R`).
- An event filed from mail keeps a link back to the thread.

**The rest**

- Settings window: layout, accounts, appearance, calendar zone, notifications, remote images, Install.
- Install is a one-click app on Chromium, or Super + Alt + Space → Install → Web App on Omarchy. No terminal.
- Mail send/parse stack is Nodemailer 9.0.5 and mailparser 3.9.15 (nested linkify-it and html-to-text pinned past the high advisories).
- Omarchy themes: Steel, Nord, Everforest, Gruvbox, Tokyo Night, Catppuccin, Kanagawa, Rosé Pine, White, Auto.
- Install-on-Omarchy overlay. Compose via `/?compose=1`. Desktop notifications for mail and upcoming events.
- Sign-in so mailbox and calendar secrets stay per-user.

MIT.

# Changelog

## 0.4.0 — 2026-08-22

Compose attachments, To: complete, and an inbox you can train.

- Attach files in compose (paperclip or drop). Eight files, 8 MB. They send over SMTP.
- To and Cc complete from people you’ve mailed. Tab or Enter accepts.
- Editable Focused / Other rules. First match wins; unmatched keep the mailbox split.
- Train from a thread: `Shift+I` Focused, `Shift+O` Other. Sidebar **Rules**, or ⌘K.

## 0.3.0 — 2026-08-22

Calendars that write back.

- CalDAV two-way: Fastmail, iCloud, Nextcloud, generic (`A` from the calendar)
- Google Calendar two-way when OAuth is configured on the host; otherwise a secret iCal URL (read-only)
- Continue with Google asks for Gmail and Calendar after identity, then attaches both
- ICS feed subscribe
- Add and delete on writable calendars; mail and local events still work signed out
- Sync (`R`), source chips, connect overlay after sign-in

## 0.2.0 — 2026-08-22

The 0.1 client, finished.

- Thread summarize (`Y`) — Grok when signed in, local notes otherwise
- Follow-up bounce — send with “Remind me”; it comes back unread if they don’t reply
- Send later from compose
- Calendar: month grid, day agenda, add/remove local events (`G` then `C`)
- Mute (`M`), bulk select (`X`), labels (`L`)
- Waiting folder (`G` then `W`)
- Unified search across Work and Personal
- Rewrite with Grok: shorter / warmer
- Catppuccin, Kanagawa, and Rosé Pine palettes

## 0.1.0 — 2026-08-22

First public cut. MIT.

- Keyboard-first three-pane client (J/K, E Done, C compose, ⌘K, ?)
- IMAP/SMTP for Gmail, Fastmail, iCloud, generic hosts; two-way archive/star/unread
- HTML mail, blocked remote images, tracking pixels stripped
- Two mailboxes (Work / Personal)
- Omarchy themes and install overlay
- Demo inbox so the keys work before you connect

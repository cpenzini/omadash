# Omadash 0.4

Keyboard-first email for [Omarchy](https://omarchy.org). Fast as a terminal client. Useful as Superhuman. Yours, because the code is.

**Version 0.4.0 · MIT · free forever** · [Changelog](CHANGELOG.md)

Omadash is a three-pane mail client you drive from the home row. `J` / `K` to move, `E` to Done (it archives on the server), `C` to compose, `⌘K` for everything else, `?` for the full map. HTML mail renders; tracking pixels do not. Two mailboxes. Omarchy themes. Install it as a web app and bind `Super + M`.

## Philosophy

Mail became a product that watches you. Clients got slower so they could sell you AI, read receipts you didn't ask for, and a workspace you don't control.

Omadash takes the other side:

1. **Keys over chrome.** If a thing happens more than twice a day, it has a key. The mouse is a fallback, not the design.
2. **Your mailbox stays yours.** IMAP and SMTP. Gmail, Fastmail, iCloud, or anything that still speaks the protocol. Done writes `\Seen` and moves to All Mail / Archive. Star and unread write back. No proprietary sync silo.
3. **Privacy is the default.** Remote images stay blocked until you say so. Known tracking pixels never load, even then. App passwords, not your real account password. Credentials sealed on the server, scoped to your login.
4. **Native to Omarchy.** Nord, Everforest, Gruvbox, Tokyo Night, Catppuccin, Kanagawa, Rosé Pine, a steel dark, a paper light, or follow the system. A one-screen install for Hyprland + mako.
5. **Small enough to hold in your head.** One store, one keymap, one IMAP module. If you can read TypeScript you can change the client.

## What works today

- Keyboard-first three-pane mail (list, read, compose)
- Split inbox (Focused / Other) with editable rules and train-from-thread (`Shift+I` / `Shift+O`)
- Done, trash, star, unread, snooze, mute, undo
- Bulk select (`X`) and labels (`L`)
- Command palette and snippet expansion (`;thanks`)
- Thread summarize (`Y`) and Grok drafts (shorter / warmer)
- Follow-up bounce and send later
- Calendar — mail, local events, CalDAV, Google, ICS (`G` then `C`; `A` to connect)
- Continue with Google attaches Gmail + Calendar (IMAP XOAUTH2)
- Waiting folder
- Unified search across Work and Personal
- HTML messages with a sanitizer and tracking-pixel block
- Attachment download (IMAP) and compose attachments (drop or paperclip)
- To / Cc complete from people you’ve mailed
- Two mailboxes, `G` then `1` / `2`
- Gmail / Fastmail / iCloud / generic IMAP, two-way
- Omarchy theme picker (`,` or `G` then `A`)
- Install-on-Omarchy overlay, compose via `/?compose=1`, desktop notifications
- Sign-in so mailbox secrets stay per-user

Demo mail is there so you can feel the keys before you connect anything.

## Keys

Hit `?` in the app for the full map.

| Key | Action |
| --- | --- |
| `J` / `K` | Next / previous thread |
| `E` | Done — archives on the server |
| `#` | Trash |
| `C` | Compose |
| `R` / `Shift+R` | Reply / reply all |
| `F` | Forward |
| `Shift+I` / `Shift+O` | Train this person as Focused / Other |
| `Y` | Summarize thread |
| `H` | Snooze |
| `L` | Label |
| `⌘K` / `/` | Command palette |
| `⌘↵` | Send |
| `G` then `C` | Calendar |
| `G` then `I` / `W` / `T` / `D` | Inbox / Waiting / Sent / Drafts |
| `G` then `1` / `2` | Work / Personal mailbox |
| `?` | Keyboard reference |

Inbox rules live in the sidebar (**Rules**) and in `⌘K`. Compose accepts a paperclip or a dropped file.

## Quick start

```bash
git clone https://github.com/cpenzini/omadash.git
cd omadash
npm install
npm run dev
```

Sign in with Google to attach Gmail and Calendar (one extra Google approval). Or Connect mailbox with an [app password](https://myaccount.google.com/apppasswords).

```bash
npm run typecheck
npm run build
```

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TanStack Start / Router / Query |
| State | Zustand, localStorage cache |
| Style | Tailwind v4, CSS variables per theme |
| Mail | IMAPFlow + Nodemailer + mailparser |
| Data | Postgres (Neon) or PGLite in preview |
| Auth | Better Auth, email OTP |
| AI | xAI Grok (`grok-4.5`), user-initiated |

## Repository map

```
src/lib/app.ts            name, version, tagline
src/lib/theme.ts          palettes
src/lib/mail/             the product
  types.ts                folders, threads, messages
  store.ts                every client action
  hotkeys.ts              the keymap
  rules.ts                Focused / Other split
  contacts.ts             compose autocomplete
  mailbox.ts              server functions (auth-scoped)
  imap.server.ts          IMAP/SMTP
  calendar.ts             meetings from mail + local store
  calendar-sync.ts        CalDAV / Google / ICS (auth-scoped)
  caldav.server.ts        tsdav
  google-cal.server.ts    Google Calendar API
  ai.ts                   summarize / draft / rewrite
  presets.ts              add a provider here
  snippets.ts             add a snippet here
  html.ts                 sanitizer + image policy
src/components/mail/      UI
src/styles.css            [data-theme] tokens
docs/EXTENDING.md         how to grow it
CHANGELOG.md              what shipped
```

## License

MIT. Copy it, ship it, sell a hosted version if you want — keep the license notice. Mail should not be a subscription to your own inbox.

## Credits

Built for people on Omarchy who wanted Superhuman speed without Superhuman terms. Named Omadash because it sits on the Omarchy desktop and gets you to zero.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/EXTENDING.md](docs/EXTENDING.md).

# Omadash 0.4

Keyboard-first mail and calendar for [Omarchy](https://omarchy.org). Fast as a terminal client. Useful as Superhuman. Yours, because the code is.

**Version 0.4.0 · MIT · free forever** · [Changelog](CHANGELOG.md)

Omadash is one client for the inbox and the day. Three panes for mail, a month and a day agenda for the calendar, both driven from the home row. `J` / `K` to move, `E` to Done (it archives on the server), `C` to compose, `G` then `C` for the calendar, `⌘K` for everything else, `?` for the full map.

HTML mail renders; tracking pixels do not. Meetings in a thread show up on the day they belong to. Two mailboxes. CalDAV and Google when you want them live. Omarchy themes. Install it as a web app and bind `Super + M`.

## Philosophy

Mail and calendar became two products that watch you. Clients got slower so they could sell you AI, read receipts you didn't ask for, a workspace you don't control, and a calendar that only talks to itself.

Omadash takes the other side:

1. **Keys over chrome.** If a thing happens more than twice a day, it has a key. The mouse is a fallback, not the design. Mail and calendar share that map — you do not leave the client to see Tuesday.
2. **Your mailbox and your calendar stay yours.** IMAP and SMTP for mail. CalDAV, Google Calendar, or an ICS URL for the day. Gmail, Fastmail, iCloud, Nextcloud, or anything that still speaks the protocol. Done writes `\Seen` and moves to All Mail / Archive. Star and unread write back. Events you can write, you can delete. No proprietary sync silo.
3. **Privacy is the default.** Remote images stay blocked until you say so. Known tracking pixels never load, even then. App passwords, not your real account password. Credentials sealed on the server, scoped to your login. The calendar you haven't connected yet is local, and it still works.
4. **Native to Omarchy.** Nord, Everforest, Gruvbox, Tokyo Night, Catppuccin, Kanagawa, Rosé Pine, a steel dark, a paper light, or follow the system. A one-screen install for Hyprland + mako.
5. **Small enough to hold in your head.** One store, one keymap, one IMAP module, one calendar door. If you can read TypeScript you can change the client.

## What it is

A **three-pane mail client**: list, reading pane, compose. Split inbox — Focused and Other — with rules you edit and train from a thread (`Shift+I` / `Shift+O`). Done, snooze, mute, waiting, undo. Compose completes To and Cc from people you've mailed, attaches files, sends later, and can bounce a thread back if they don't reply.

A **calendar that belongs to the same hands**: `G` then `C`. Month grid, day agenda, mail-derived events, local events you add with `N`. Connect Fastmail, iCloud, Nextcloud, or generic CalDAV (`A`) and it writes back. Google Calendar two-way when the host has OAuth; otherwise a secret iCal URL, read-only. Subscribe to an ICS feed. Sync with `R`.

**Continue with Google** is identity first, then one extra approval that attaches Gmail (IMAP XOAUTH2) and Calendar together. Or connect a mailbox with an app password and the calendar separately. Sign-in keeps those secrets per-user.

Demo mail and a local calendar are there so the keys work before you connect anything.

## What works today

**Mail**
- Keyboard-first three-pane client (list, read, compose)
- Split inbox with editable rules; train-from-thread (`Shift+I` / `Shift+O`)
- Done, trash, star, unread, snooze, mute, undo
- Bulk select (`X`) and labels (`L`)
- Waiting folder (`G` then `W`)
- Command palette, snippets (`;thanks`)
- Thread summarize (`Y`) and Grok drafts (shorter / warmer)
- Follow-up bounce and send later
- To / Cc complete from people you've mailed
- Compose attachments (paperclip or drop, 8 files / 8 MB)
- HTML with a sanitizer and tracking-pixel block
- Attachment download on IMAP
- Two mailboxes, `G` then `1` / `2`
- Gmail / Fastmail / iCloud / generic IMAP, two-way

**Calendar**
- Month grid and day agenda (`G` then `C`)
- Events pulled from mail, plus local add / delete (`N`)
- CalDAV two-way (Fastmail, iCloud, Nextcloud, generic)
- Google Calendar two-way when OAuth is on the host; otherwise a secret iCal URL
- ICS feed subscribe
- Sync (`R`), source chips, connect overlay (`A`)

**The rest**
- Continue with Google attaches Gmail + Calendar
- Unified search across Work and Personal
- Omarchy theme picker (`,` or `G` then `A`)
- Install-on-Omarchy overlay, compose via `/?compose=1`, desktop notifications
- Sign-in so mailbox and calendar secrets stay per-user

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

On the calendar: `H` / `L` day, `[` / `]` month, `T` today, `N` new event, `A` connect, `R` sync, Enter opens the mail, `#` deletes an event you can write.

Inbox rules live in the sidebar (**Rules**) and in `⌘K`. Compose accepts a paperclip or a dropped file.

## Quick start

```bash
git clone https://github.com/cpenzini/omadash.git
cd omadash
npm install
npm run dev
```

Sign in with Google to attach Gmail and Calendar (one extra Google approval). Or Connect mailbox with an [app password](https://myaccount.google.com/apppasswords), and connect a calendar from `G` then `C`, then `A`.

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
| Calendar | tsdav (CalDAV), Google Calendar API, ICS |
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

MIT. Copy it, ship it, sell a hosted version if you want — keep the license notice. Mail should not be a subscription to your own inbox, and the calendar should not be a second one.

## Credits

Built for people on Omarchy who wanted Superhuman speed without Superhuman terms — mail and the day on the same keys. Named Omadash because it sits on the Omarchy desktop and gets you to zero.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/EXTENDING.md](docs/EXTENDING.md).

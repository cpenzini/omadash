# Omadash 0.1

Keyboard-first mail and calendar for [Omarchy](https://omarchy.org). Fast as a terminal client. Useful as Superhuman. Yours, because the code is.

**Version 0.1.0 · MIT · free forever** · [Changelog](CHANGELOG.md)

Omadash is one client for the inbox and the day. Two panes for mail by default — a compact list, Enter to open a thread — or three panes if you want the list beside the message. A full-window calendar with day, week, work week, month, and agenda. Both driven from the home row.

`J` / `K` to move. `E` to Done (it archives on the server). `C` to compose. `N` to file a date from a thread onto a calendar. `1` / `2` / `3` for mailbox / mailbox / calendar. `` ` `` to cycle them. `,` for settings. `⌘K` for everything else. `?` for the full map.

HTML mail renders; tracking pixels do not. Two mailboxes. As many calendars as you connect, each with its own color. CalDAV and Google when you want them live. Omarchy themes. Install it as a web app and bind `Super + M`.

Nothing is shown until it is yours: connect a mailbox to see mail, connect a calendar to see the day. Same as Mail and Calendar on a phone.

## Philosophy

Mail and calendar became two products that watch you. Clients got slower so they could sell you AI, read receipts you didn't ask for, a workspace you don't control, and a calendar that only talks to itself.

Omadash takes the other side:

1. **Keys over chrome.** If a thing happens more than twice a day, it has a key. The mouse is a fallback, not the design. Mail and calendar share that map — you do not leave the client to see Tuesday.
2. **Your mailbox and your calendar stay yours.** IMAP and SMTP for mail. CalDAV, Google Calendar, or an ICS URL for the day. Gmail, Fastmail, iCloud, Nextcloud, or anything that still speaks the protocol. Done writes `\Seen` and moves to All Mail / Archive. Star and unread write back. Events you can write, you can delete. No proprietary sync silo.
3. **Privacy is the default.** Remote images stay blocked until you say so. Known tracking pixels never load, even then. App passwords, not your real account password. Credentials sealed on the server, scoped to your login. Until you connect a mailbox or a calendar, the panes stay empty — no sample inbox, no sample week.
4. **Native to Omarchy.** Nord, Everforest, Gruvbox, Tokyo Night, Catppuccin, Kanagawa, Rosé Pine, a steel dark, a paper light, or follow the system. A one-screen install for Hyprland + mako.
5. **Small enough to hold in your head.** One store, one keymap, one IMAP module, one calendar door. If you can read TypeScript you can change the client.

## What it is

A **two-pane mail client** by default: a compact one-line list, then Enter to open and act. Three panes (list beside the thread) is a setting, `,` or `\`. Split inbox — Focused and Other — with rules you edit and train from a thread (`Shift+I` / `Shift+O`). Done, snooze, mute, waiting, undo. Compose completes To and Cc from people you've mailed, attaches files, sends later, and can bounce a thread back if they don't reply. Send holds eight seconds so `U` can catch it. The open tab peeks INBOX and syncs when something arrives. `⌘K` searches every connected mailbox.

A **calendar on equal terms with mail**: `3` or `G` then `C` replaces the mail panes with a full window. Day, week, work week, month, and agenda. Time grid, now-line, a second time zone, overlapping events. Connect as many calendars as you want; each account gets its own color. When you add an event (`N` from the calendar), pick which calendar it belongs to. From mail, `N` files a date in the thread onto a chosen calendar — the event opens the thread again. Events in the next ten minutes ping the desktop. CalDAV writes back.

**Continue with Google** is identity first, then one extra approval that attaches Gmail (IMAP XOAUTH2) and Calendar together. Or connect a mailbox with an app password and the calendar separately. Sign-in keeps those secrets per-user.

Empty on purpose: connect a mailbox to see mail, connect a calendar to see the day. Two mailboxes. As many calendars as you attach. Settings for layout, accounts, theme, zone, notifications, and remote images. Omarchy themes. Install it as a web app and bind `Super + M`.

## What works today

**Mail**
- Keyboard-first two-pane client (compact list, Enter to open) with an optional three-pane split
- Split inbox with editable rules; train-from-thread (`Shift+I` / `Shift+O`)
- Done, trash, star, unread, snooze, mute, undo
- Bulk select (`X`) and labels (`L`)
- Waiting folder (`G` then `W`); snoozed, sent, drafts, done, trash
- Command palette (`⌘K` / `/`) and snippets (`;thanks`)
- Thread summarize (`Y`) and Grok drafts (shorter / warmer)
- Follow-up bounce and send later
- To / Cc complete from people you've mailed
- Compose attachments (paperclip or drop, 8 files / 8 MB)
- HTML with a sanitizer; remote images blocked until you show them; tracking pixels never load
- HTML reflows with the reading pane
- Attachment download on IMAP
- Two mailboxes, `1` / `2` or `G` then `1` / `2`
- Live IMAP — the open tab peeks INBOX and syncs when something arrives
- `⌘K` searches every connected mailbox
- Send holds 8 seconds so `U` can catch it
- File a date from a thread onto a calendar (`N`) — detected times become chips
- Gmail / Fastmail / iCloud / generic IMAP, two-way
- Empty until you connect — no sample inbox

**Calendar**
- Full window next to mail (`3` or `G` then `C`) — not an overlay
- Day, week, work week, month, and agenda (`D` / `W` / `F` / `M` / `A`); `V` cycles them
- Timed grid with overlapping events, now-line, all-day row
- Second time zone (`Z`)
- Desktop ping ten minutes before an event
- Month cells show event titles; click a slot to add
- Multiple calendar accounts, each with its own color; click the dot to change it
- Pick the destination calendar when you create an event
- File from mail (`N`); the event keeps a link back to the thread
- CalDAV two-way (Fastmail, iCloud, Nextcloud, generic)
- Google Calendar two-way when OAuth is on the host; otherwise a secret iCal URL
- ICS feed subscribe
- Sync (`R`), colored source chips, connect overlay (`P`)
- Empty until you connect — no sample week

**The rest**
- Continue with Google attaches Gmail + Calendar
- `` ` `` cycles mailbox / mailbox / calendar (Shift reverses)
- Settings (`,`) — layout, accounts, appearance, calendar zone, notifications, mail
- Omarchy theme picker (Settings, or `G` then `A`): Steel, Nord, Everforest, Gruvbox, Tokyo Night, Catppuccin, Kanagawa, Rosé Pine, White, or Auto
- Install-on-Omarchy overlay, compose via `/?compose=1`
- Desktop notifications for new mail and upcoming events
- Sign-in so mailbox and calendar secrets stay per-user

## Keys

Hit `?` in the app for the full map.

| Key | Action |
| --- | --- |
| `J` / `K` | Next / previous thread |
| `Enter` / `O` | Open thread |
| `E` | Done — archives on the server |
| `#` | Trash |
| `C` | Compose |
| `R` / `Shift+R` | Reply / reply all |
| `F` | Forward |
| `H` | Snooze |
| `N` | File on calendar |
| `S` | Star |
| `X` | Select |
| `M` | Mute |
| `L` | Label |
| `Y` | Summarize thread |
| `Z` | Toggle unread |
| `U` | Undo |
| `Shift+I` / `Shift+O` | Train this person as Focused / Other |
| `⌘K` / `/` | Search all mailboxes |
| `,` | Settings |
| `\` | Two panes / three panes |
| `⌘↵` | Send — 8 seconds to undo |
| `G` then `C` / `3` | Calendar |
| `G` then `I` / `W` / `T` / `D` | Inbox / Waiting / Sent / Drafts |
| `1` / `2` | Mailbox 1 / 2 |
| `` ` `` | Cycle mailbox / calendar |
| `?` | Keyboard reference |

On the calendar: `D` / `W` / `F` / `M` / `A` views, `V` cycles them, `Z` second time zone, `H` / `L` period, `T` today, `N` new event (pick which calendar), `P` connect, `R` sync, `J` / `K` next event, Enter opens the linked thread, `#` deletes an event you can write, `` ` `` cycles back to mail, `Esc` back to mail.

Inbox rules live in the sidebar (**Rules**) and in `⌘K`. Compose accepts a paperclip or a dropped file. From a thread, times in the body become chips — click one or press `N` to file it.

## Quick start

```bash
git clone https://github.com/cpenzini/omadash.git
cd omadash
npm install
npm run dev
```

Sign in with Google to attach Gmail and Calendar (one extra Google approval). Or Connect mailbox with an [app password](https://myaccount.google.com/apppasswords), and connect a calendar from `3`, then `P`.

The panes stay empty until you connect. That is the point.

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
  prefs.ts                two-pane / three-pane, settings
  rules.ts                Focused / Other split
  contacts.ts             compose autocomplete
  dates.ts                times in a thread → calendar
  mailbox.ts              server functions (auth-scoped)
  imap.server.ts          IMAP/SMTP
  calendar.ts             views, grid, local store
  calendar-sync.ts        CalDAV / Google / ICS (auth-scoped)
  caldav.server.ts        tsdav
  google-cal.server.ts    Google Calendar API
  notify.ts               mail + upcoming-event pings
  ai.ts                   summarize / draft / rewrite
  presets.ts              add a mail provider here
  cal-presets.ts          add a calendar host here
  snippets.ts             add a snippet here
  html.ts                 sanitizer + image policy
src/components/mail/      UI
  settings.tsx            layout, accounts, theme, zone
  file-event.tsx          N from a thread
  calendar-panel.tsx      the full-window calendar
src/styles.css            [data-theme] tokens
docs/EXTENDING.md         how to grow it
CHANGELOG.md              what shipped
```

## License

MIT. Copy it, ship it, sell a hosted version if you want — keep the license notice. Mail should not be a subscription to your own inbox, and the calendar should not be a second one.

## Credits

Built for people on Omarchy who wanted Superhuman speed without Superhuman terms — mail and the day on the same keys. Named Omadash because it sits on the Omarchy desktop and gets you to zero.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/EXTENDING.md](docs/EXTENDING.md).

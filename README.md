# Omadash 0.1

Keyboard-first mail and calendar for [Omarchy](https://omarchy.org). Fast as a terminal client. Useful as Superhuman. Yours, because the code is.

**Version 0.1.0 · MIT · free forever** · [Changelog](CHANGELOG.md)

Omadash is one client for the inbox and the day. Mail opens as a compact list — one line per thread — and Enter opens the message, the way Superhuman works. If you want the list beside the reading pane, that is a setting. Calendar is a full window, not a popup: day, week, work week, month, and agenda. You move both with the same keys.

The point of the home row is that you never leave. `J` and `K` move. `E` marks a thread done and archives it on the server. `C` composes. `N` takes a date out of a mail and files it on a calendar. `1` and `2` are mailboxes, `3` is the calendar, and `` ` `` cycles through them. Comma opens settings. `⌘K` is search and commands. `?` is the map.

Nothing is shown until it is yours. Connect a mailbox to see mail. Connect a calendar to see the day. Same idea as Mail and Calendar on a phone — no sample inbox, no sample week.

## Why it exists

Mail and calendar became two products that watch you. Clients got slower so they could sell AI, read receipts you did not ask for, a workspace you do not control, and a calendar that only talks to itself.

Omadash takes the other side. If a thing happens more than twice a day, it has a key. The mouse is a fallback, not the design. Your mailbox stays IMAP and SMTP; your calendar stays CalDAV, Google, or an ICS URL. Gmail, Fastmail, iCloud, Nextcloud, or anything that still speaks the protocol. Done writes `\Seen` and moves the message to All Mail / Archive. Star and unread write back. Events you can write, you can delete.

Privacy is the default. Remote images stay blocked until you say so. Known tracking pixels never load, even then. App passwords, not your real account password. Credentials sit on the server, scoped to your login.

It is meant to live on Omarchy. Nord, Everforest, Gruvbox, Tokyo Night, Catppuccin, Kanagawa, Rosé Pine, a steel dark, a paper light, or follow the system. Install it as a web app and bind `Super + M`. The source is small enough to hold in your head: one store, one keymap, one IMAP module, one calendar door. If you can read TypeScript you can change the client.

## Mail

Two panes is the default. The list is dense, one line per thread. Enter (or `O`) opens it; Esc goes back. Three panes — list on the left, thread on the right — is `\`, or Settings.

The inbox splits into Focused and Other. You can edit the rules, and you can train a person from a thread with `Shift+I` and `Shift+O`. Waiting is a folder (`G` then `W`). Snooze, mute, labels, bulk select, undo: the usual work, on keys.

Compose completes To and Cc from people you have mailed. You can attach files (paperclip or drop, eight files, eight megabytes), send later, or bounce a thread back unread if they do not reply. Send holds eight seconds so `U` can catch it. HTML renders and reflows with the pane; tracking pixels are stripped. The open tab peeks INBOX and syncs when something arrives. `⌘K` searches every connected mailbox.

From a thread, `N` files a date onto a calendar. If the mail says “Friday at 2pm” or “tomorrow 9–10”, those times show up as chips. Click one, pick which calendar, and the event keeps a link back to the thread.

Gmail, Fastmail, iCloud, and generic IMAP all write back. Two mailboxes.

## Calendar

`3` or `G` then `C` replaces the mail panes with a full calendar. Day, week, work week, month, and agenda (`D` / `W` / `F` / `M` / `A`). There is a timed grid, overlapping events, a now-line, an all-day row, and a second time zone (`Z`). Month cells show titles. Click a slot to add. `N` creates an event and asks which calendar it belongs to.

You can connect as many calendars as you want. Each account has its own color; click the dot to change it. CalDAV (Fastmail, iCloud, Nextcloud, generic) writes back. Google Calendar writes back when OAuth is on the host; otherwise you can paste a secret iCal URL. ICS feeds subscribe. `R` syncs. `P` connects. Events in the next ten minutes ping the desktop. Enter on an event that came from mail opens the thread.

## Connect

Continue with Google is identity first, then one extra approval that attaches Gmail and Calendar together. Or connect a mailbox with an [app password](https://myaccount.google.com/apppasswords) and the calendar separately from `3`, then `P`. Sign-in keeps those secrets per-user.

Settings (`,`) is layout, accounts, appearance, calendar zone, notifications, and whether remote images load. Themes live there too, or `G` then `A`.

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

On the calendar: `D` / `W` / `F` / `M` / `A` views, `V` cycles them, `Z` second time zone, `H` / `L` period, `T` today, `N` new event, `P` connect, `R` sync, `J` / `K` next event, Enter opens the linked thread, `#` deletes an event you can write, `` ` `` cycles back to mail, `Esc` back to mail.

Inbox rules live in the sidebar and in `⌘K`. Snippets expand in compose with a semicolon (`;thanks`).

## Run it

```bash
git clone https://github.com/cpenzini/omadash.git
cd omadash
npm install
npm run dev
```

The panes stay empty until you connect. That is the point.

```bash
npm test
npm run typecheck
npm run build
```

`npm test` covers the mail and calendar logic, then the running app (empty until connect, settings, calendar, keys). `npm run test:browser` is the app pass on its own.

## Stack

React 19 and TanStack Start. Zustand for client state. Tailwind v4 with a CSS variable per theme. IMAPFlow, Nodemailer, and mailparser for mail. tsdav, the Google Calendar API, and ICS for the day. Postgres (Neon) or PGLite in preview. Better Auth for sign-in. Grok when you ask it to summarize or rewrite — never unsolicited.

How to add a provider, a theme, a key, or a snippet is in [docs/EXTENDING.md](docs/EXTENDING.md). Patches we want are in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. Copy it, ship it, sell a hosted version if you want — keep the license notice. Mail should not be a subscription to your own inbox, and the calendar should not be a second one.

Built for people on Omarchy who wanted Superhuman speed without Superhuman terms. Named Omadash because it sits on the desktop and gets you to zero.

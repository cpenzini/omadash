import type { Person, Thread } from "./types";
import { DEMO_PERSONAL, ME } from "./types";

const ago = (now: number, hours: number, minutes = 0) =>
  new Date(now - (hours * 60 + minutes) * 60_000).toISOString();

const P = {
  maya: { name: "Maya Chen", email: "maya@studio.null" },
  jordan: { name: "Jordan Hale", email: "jordan@omarchy.org" },
  priya: { name: "Priya Nair", email: "priya@northstar.jobs" },
  sam: { name: "Sam Okonkwo", email: "sam@flywheel.dev" },
  elena: { name: "Elena Voss", email: "elena@cal.local" },
  luis: { name: "Luis Ortega", email: "luis@ledger.coop" },
  riley: { name: "Riley Park", email: "riley@linuxconf.au" },
  nora: { name: "Nora Kim", email: "nora@kernel.studio" },
  tom: { name: "Tom Becker", email: "tom@flywheel.dev" },
  ana: { name: "Ana Silva", email: "ana@omarchy.org" },
  github: { name: "GitHub", email: "notifications@github.com" },
  stripe: { name: "Stripe", email: "receipts@stripe.com" },
  changelog: { name: "The Changelog", email: "news@changelog.com" },
  linear: { name: "Linear", email: "noreply@linear.app" },
  figma: { name: "Figma", email: "updates@figma.com" },
  digest: { name: "Omarchy Digest", email: "digest@omarchy.org" },
  cal: { name: "Cal.com", email: "reminders@cal.com" },
  fly: { name: "Fly.io", email: "deploys@fly.io" },
  linkedin: { name: "LinkedIn", email: "jobs-listings@linkedin.com" },
} satisfies Record<string, Person>;

export function buildSeed(now = Date.parse("2026-08-22T05:00:00.000Z")): Thread[] {
  return [
    {
      id: "t-maya-bar",
      subject: "Hyprland bar — final pass before freeze",
      folder: "inbox",
      unread: true,
      starred: true,
      focused: true,
      labels: ["Work"],
      messages: [
        {
          id: "m-maya-1",
          from: P.maya,
          to: [ME],
          cc: [],
          date: ago(now, 0, 22),
          body: `Alex —

Attached is the 1.0 of the bar. I dropped the redundant workspace glyphs and tightened the clock to tabular nums so it doesn't jump.

Two things I want your eye on before we freeze Thursday:

1. The tray overflow still clips on 125% scaling. Repro on a 14" Framework.
2. The focused-window title truncates mid-glyph in CJK. I can ellipsize earlier, or we switch the font.

If you have 20 minutes this afternoon I can jump on a call. Otherwise I'll ship the first fix tonight.

Maya`,
          attachments: [
            {
              name: "bar-notes.txt",
              size: "1 KB",
              mime: "text/plain",
              dataUrl:
                "data:text/plain;charset=utf-8,Bar%201.0%20notes%0A%0A-%20tabular%20clock%0A-%20drop%20workspace%20glyphs%0A-%20CJK%20ellipsis%20still%20open%0A",
            },
            { name: "tray-clip.mp4", size: "6.2 MB" },
          ],
          tracking: false,
          opens: [],
          receiptRequested: true,
        },
      ],
    },
    {
      id: "t-tom-pr",
      subject: "Review: input latency on the compositor shim",
      folder: "inbox",
      unread: true,
      starred: false,
      focused: true,
      labels: ["Work"],
      messages: [
        {
          id: "m-tom-1",
          from: P.tom,
          to: [ME],
          cc: [P.sam],
          date: ago(now, 1, 5),
          body: `Need a second pair of eyes on #842 before I merge.

The shim now batches pointer events per frame instead of per-event syscalls. On my machine p99 input-to-pixel dropped from 18ms → 7ms. I want to make sure I'm not papering over a race in the seat listener.

PR is ready, tests green, no protocol changes. Comment inline if the seat lock looks wrong — that's the only part I'm not proud of.

Tom`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-incident",
      subject: "prod: mail-ingest 5xx between 02:14–02:31 UTC",
      folder: "inbox",
      unread: true,
      starred: false,
      focused: true,
      labels: ["Work"],
      messages: [
        {
          id: "m-inc-1",
          from: P.sam,
          to: [ME, P.tom],
          cc: [],
          date: ago(now, 6, 40),
          body: `We took a burst of 502s on ingest. TLS handshake to the upstream MX started failing after the cert rotation. Rolled back the proxy config at 02:27; error rate is flat now.

Writing the postmortem this morning. Alex — can you own the "why didn't the canary catch this" section? The canary was posting to the old MX alias.

Sam`,
          attachments: [{ name: "ingest-5xx.json", size: "88 KB" }],
          tracking: false,
          opens: [],
        },
        {
          id: "m-inc-2",
          from: ME,
          to: [P.sam, P.tom],
          cc: [],
          date: ago(now, 5, 55),
          body: `On it. The canary still resolves mx-canary.omarchy.dev to the previous anycast address — I'll move it under the same Terraform as prod before standup.

Will have the section in the doc by 10.`,
          attachments: [],
          tracking: true,
          opens: [
            {
              at: ago(now, 5, 40),
              city: "Austin",
              device: "MacBook Pro",
            },
          ],
        },
        {
          id: "m-inc-3",
          from: P.tom,
          to: [ME, P.sam],
          cc: [],
          date: ago(now, 5, 10),
          body: `Thanks both. I'll add the TLS expiry check to the smoke suite so this class of miss pages us, not the users.

Standup as usual — no need to pull anyone else in.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-jordan",
      subject: "Omarchy ISO — Monday cut",
      folder: "inbox",
      unread: false,
      starred: true,
      focused: true,
      labels: ["Work"],
      messages: [
        {
          id: "m-jordan-1",
          from: P.jordan,
          to: [ME, P.ana],
          cc: [],
          date: ago(now, 8),
          body: `Monday we cut 3.1. The installer now boots to a working Hyprland session in under 40s on the Framework 13, and the theme picker writes gtk + kitty + waybar in one shot.

Alex — can you take the mail-client default? People keep asking for something that's as fast as Superhuman and actually lives on this desktop. Keyboard-first, no Electron soup if we can help it.

If Omadash is ready to pin as a web app, I'll put it in the default Super+Shift+E slot next to HEY.

Jordan`,
          attachments: [],
          tracking: false,
          opens: [],
        },
        {
          id: "m-jordan-2",
          from: P.ana,
          to: [P.jordan, ME],
          cc: [],
          date: ago(now, 7, 20),
          body: `I'll handle the ISO notes and the mirrored package. Alex, send me the icon URL and the app id you want in omarchy-webapps.toml.

Also: please don't ship a first-run tour that talks for 90 seconds. These users already know J and K.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-elena",
      subject: "Thursday 2pm — still good?",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: true,
      labels: ["Work"],
      messages: [
        {
          id: "m-elena-1",
          from: P.elena,
          to: [ME],
          cc: [],
          date: ago(now, 11),
          body: `Confirming Thursday 2:00–2:30pm Eastern for the Omadash keyboard review.

I'll send a Cal link if we need to move it. Agenda is just: shortcuts that feel native on Omarchy, and whether Done vs Archive is the right verb.

Elena`,
          attachments: [{ name: "invite.ics", size: "2 KB" }],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-priya",
      subject: "Staff engineer — looping you in",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: true,
      labels: ["Waiting"],
      messages: [
        {
          id: "m-priya-1",
          from: P.priya,
          to: [ME],
          cc: [],
          date: ago(now, 20),
          body: `Alex,

I have a staff+ compositor candidate I think you'd enjoy talking to. Ex-Red Hat, recently on a tiling WM, strong on input latency.

Would you take a 30-minute screen this week? I can send two times that don't collide with the ISO freeze.

Priya`,
          attachments: [{ name: "candidate-packet.pdf", size: "420 KB" }],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-nora",
      subject: "Intro: Nora Kim ↔ Alex Rivera",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: true,
      labels: ["Personal"],
      messages: [
        {
          id: "m-nora-1",
          from: P.nora,
          to: [ME],
          cc: [P.maya],
          date: ago(now, 28),
          body: `Maya suggested I write.

I run a small type foundry — we just cut a monospace meant to sit in a status bar at 11px and still be readable. Thought it might be a fit for Omadash's shortcut strip.

Happy to send specimens, or you can ignore this entirely.

Nora`,
          attachments: [{ name: "bar-mono-specimens.pdf", size: "2.1 MB" }],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-riley",
      subject: "Your talk is confirmed — Linux.conf",
      folder: "inbox",
      unread: false,
      starred: true,
      focused: true,
      labels: ["Personal"],
      messages: [
        {
          id: "m-riley-1",
          from: P.riley,
          to: [ME],
          cc: [],
          date: ago(now, 34),
          body: `You're on Thursday at 11:20 in Hall B.

Title we have: "Inbox at 120Hz — building a Superhuman-class client for a tiling WM."

Speaker booth opens 30 minutes prior. HDMI and USB-C both work. If you want a handheld clicker, grab one from AV.

See you in Adelaide.

Riley`,
          attachments: [{ name: "speaker-brief.pdf", size: "310 KB" }],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-luis",
      subject: "Invoice #1842 — August",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: true,
      labels: ["Work"],
      messages: [
        {
          id: "m-luis-1",
          from: P.luis,
          to: [ME],
          cc: [],
          date: ago(now, 46),
          body: `August retainer is attached. Net-15 as usual.

Let me know if the "design systems" line should split out from product this month — I can reissue.

Luis`,
          attachments: [{ name: "INV-1842.pdf", size: "96 KB" }],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-github",
      subject: "[basecamp/omarchy] 12 notifications",
      folder: "inbox",
      unread: true,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "m-gh-1",
          from: P.github,
          to: [ME],
          cc: [],
          date: ago(now, 0, 48),
          body: `basecamp/omarchy

• #1900 Terminal based email client — 3 new comments
• #2144 Default web apps — Jordan Hale requested review
• dependabot: bump hyprland from 0.51.1 to 0.52.0

View all on GitHub.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-linear",
      subject: "Alex assigned you 3 issues",
      folder: "inbox",
      unread: true,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "m-lin-1",
          from: P.linear,
          to: [ME],
          cc: [],
          date: ago(now, 2, 15),
          body: `MAR-184  Shortcut collisions with Hyprland Super+E
MAR-185  Read-receipt panel density
MAR-186  Undo toast should not steal focus

Due this week.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-stripe",
      subject: "Payout of $4,280 is on the way",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "m-stripe-1",
          from: P.stripe,
          to: [ME],
          cc: [],
          date: ago(now, 9),
          body: `Your payout of $4,280.00 is expected to arrive in your bank account on Monday.

This payout covers 14 payments from Aug 11–18.`,
          html: `<div style="font-family:system-ui;max-width:480px">
            <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.6">Stripe</p>
            <h1 style="font-size:22px;font-weight:600;margin:8px 0 16px">Payout on the way</h1>
            <p style="font-size:28px;font-weight:600;margin:0">$4,280.00</p>
            <p style="opacity:.7">Expected Monday · 14 payments, Aug 11–18</p>
            <table style="width:100%;font-size:13px;margin-top:16px">
              <tr><td>Bank</td><td style="text-align:right">•••• 4421</td></tr>
              <tr><td>Statement</td><td style="text-align:right">Omadash · August</td></tr>
            </table>
            <img src="https://sendgrid.net/track/open/demo.gif" width="1" height="1" alt="" />
          </div>`,
          attachments: [{ name: "payout-aug.csv", size: "4 KB", mime: "text/csv", dataUrl: "data:text/csv,date,amount%0A2026-08-18,4280%0A" }],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-figma",
      subject: "Maya Chen commented on Omadash — reading pane",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "m-fig-1",
          from: P.figma,
          to: [ME],
          cc: [],
          date: ago(now, 14),
          body: `Maya Chen: "The receipt row is doing too much. One line in the header, details on hover."

Open in Figma.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-digest",
      subject: "Omarchy weekly — ISO, themes, and aerc",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "m-dig-1",
          from: P.digest,
          to: [ME],
          cc: [],
          date: ago(now, 30),
          body: `This week in Omarchy:

• 3.1 freeze is Monday
• New everforest + nord ports for waybar
• The eternal aerc vs GUI thread hit 200 comments. Bring a client that is as fast as the terminal and we might all go home.

That's the mail.`,
          html: `<div style="font-family:Georgia,serif;max-width:520px;line-height:1.5">
            <p style="letter-spacing:.16em;text-transform:uppercase;font-size:11px;opacity:.55">Omarchy weekly</p>
            <h2 style="font-weight:600;margin:8px 0 16px">ISO, themes, and aerc</h2>
            <ul>
              <li>3.1 freeze is Monday</li>
              <li>New everforest + nord ports for waybar</li>
              <li>The eternal aerc vs GUI thread hit 200 comments.</li>
            </ul>
            <p>Bring a client that is as fast as the terminal and we might all go home.</p>
            <img src="https://track.mailchimp.com/track/open.php?u=demo" width="1" height="1" alt="" />
            <img src="https://omarchy.org/og.png" alt="Omarchy" width="480" />
          </div>`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-changelog",
      subject: "The Changelog #612 — Linux on the desktop, again",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "m-ch-1",
          from: P.changelog,
          to: [ME],
          cc: [],
          date: ago(now, 40),
          body: `This week we talk to people actually using a tiling WM as their daily driver, and why email is still the last app that feels like 2009.

Listen now.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-fly",
      subject: "Deployed omadash-web@9f3a1c",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "m-fly-1",
          from: P.fly,
          to: [ME],
          cc: [],
          date: ago(now, 3, 10),
          body: `omadash-web is live in iad.

Version 9f3a1c · 18s · 0 downtime`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-cal",
      subject: "Reminder: Thursday · Omadash keyboard review",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "m-cal-1",
          from: P.cal,
          to: [ME],
          cc: [],
          date: ago(now, 4),
          body: `Thursday, 2:00 PM – 2:30 PM Eastern
With Elena Voss
Video link in the invite.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-linkedin",
      subject: "You appeared in 8 searches this week",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "m-li-1",
          from: P.linkedin,
          to: [ME],
          cc: [],
          date: ago(now, 52),
          body: `People searched for: linux desktop, email client, staff engineer.

Update your featured section.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-sent-maya",
      subject: "Re: Hyprland bar — notes from last night",
      folder: "sent",
      unread: false,
      starred: false,
      focused: true,
      labels: ["Work"],
      messages: [
        {
          id: "m-sent-maya",
          from: ME,
          to: [P.maya],
          cc: [],
          date: ago(now, 16),
          body: `Maya —

Looked at the tray clip. I think we ellipsize the title at 18ch and move overflow to a right-click. CJK I'll test on my other box tonight.

Bar is the best it's been. Let's freeze Thursday unless the Framework repro is worse than the video.

Alex`,
          attachments: [],
          tracking: true,
          opens: [
            {
              at: ago(now, 15, 46),
              city: "San Francisco",
              device: "MacBook Air",
            },
            {
              at: ago(now, 13, 20),
              city: "San Francisco",
              device: "iPhone",
            },
          ],
        },
      ],
    },
    {
      id: "t-sent-priya",
      subject: "Re: Staff engineer — looping you in",
      folder: "sent",
      unread: false,
      starred: false,
      focused: true,
      labels: ["Waiting"],
      followUpUntil: ago(now, 1),
      messages: [
        {
          id: "m-sent-priya",
          from: ME,
          to: [P.priya],
          cc: [],
          date: ago(now, 12),
          body: `Priya — yes. Wednesday 11am Eastern is clean for me. Send the packet whenever.

If they're actually on a tiling WM daily, that's already a better signal than most of the loop.

Alex`,
          attachments: [],
          tracking: true,
          opens: [],
        },
      ],
    },
    {
      id: "t-draft",
      subject: "Sponsorship for Linux.conf",
      folder: "drafts",
      unread: false,
      starred: false,
      focused: true,
      labels: [],
      messages: [
        {
          id: "m-draft-1",
          from: ME,
          to: [P.riley],
          cc: [],
          date: ago(now, 26),
          body: `Riley —

We'd like to put Omadash on a small booth next to the hallway track. Can you share the remaining sponsor tiers?

I'll have a one-pager by Friday.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "t-snooze",
      subject: "Follow up with legal on the trademark",
      folder: "snoozed",
      unread: true,
      starred: false,
      focused: true,
      labels: ["Later"],
      snoozeUntil: ago(now, -30),
      messages: [
        {
          id: "m-snooze-1",
          from: { name: "Dana Wolff", email: "dana@wolff.legal" },
          to: [ME],
          cc: [],
          date: ago(now, 70),
          body: `Alex,

Trademark search on MARSHALL is clean in class 9 for the US. EU still pending. I'll ping you when the examiner writes back — likely two weeks.

Don't print merch until then.

Dana`,
          attachments: [{ name: "search-opinion.pdf", size: "540 KB" }],
          tracking: false,
          opens: [],
        },
      ],
    },
  ];
}

export function buildPersonalSeed(now = Date.parse("2026-08-22T05:00:00.000Z")): Thread[] {
  const me = DEMO_PERSONAL;
  return [
    {
      id: "p-flight",
      subject: "Your boarding pass — MIA → SFO",
      folder: "inbox",
      unread: true,
      starred: true,
      focused: true,
      labels: ["Personal"],
      messages: [
        {
          id: "p-flight-1",
          from: { name: "United", email: "travel@united.example" },
          to: [me],
          cc: [],
          date: ago(now, 2, 40),
          body: `UA 1745 · Sat Aug 22 · Miami to San Francisco
Seat 12A · Boards 7:40 AM

Mobile boarding pass is attached.`,
          html: `<div style="font-family:system-ui;max-width:440px">
            <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.55">United</p>
            <h1 style="font-size:22px;margin:6px 0 4px">MIA → SFO</h1>
            <p style="opacity:.7;margin:0 0 16px">UA 1745 · Sat Aug 22 · Seat 12A</p>
            <p>Boards 7:40 AM · Terminal 4</p>
          </div>`,
          attachments: [
            {
              name: "boarding-pass.txt",
              size: "1 KB",
              mime: "text/plain",
              dataUrl: "data:text/plain;charset=utf-8,UA%201745%20MIA-SFO%20Seat%2012A%20Boards%207%3A40%20AM%0A",
            },
          ],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "p-mom",
      subject: "Sunday dinner if you land on time",
      folder: "inbox",
      unread: true,
      starred: false,
      focused: true,
      labels: ["Personal"],
      messages: [
        {
          id: "p-mom-1",
          from: { name: "Mom", email: "rosa@penzini.family" },
          to: [me],
          cc: [],
          date: ago(now, 5),
          body: `Alex — if the flight isn't a mess, come by at 6. Your father already bought too much bread. No laptops at the table.`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "p-lease",
      subject: "Lease renewal — Brickell",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: true,
      labels: ["Later"],
      messages: [
        {
          id: "p-lease-1",
          from: { name: "Harbor Management", email: "office@harbor.mgmt" },
          to: [me],
          cc: [],
          date: ago(now, 26),
          body: `Renewal packet is attached. Same rent if you sign by the 30th. After that it steps 4%.`,
          attachments: [
            {
              name: "renewal.txt",
              size: "2 KB",
              mime: "text/plain",
              dataUrl: "data:text/plain;charset=utf-8,Brickell%20lease%20renewal%20%E2%80%94%20sign%20by%20the%2030th%2C%20same%20rent.%0A",
            },
          ],
          tracking: false,
          opens: [],
        },
      ],
    },
    {
      id: "p-photo",
      subject: "JPEGs from last Saturday",
      folder: "inbox",
      unread: false,
      starred: false,
      focused: false,
      labels: [],
      messages: [
        {
          id: "p-photo-1",
          from: { name: "Luis Ortega", email: "luis@ledger.coop" },
          to: [me],
          cc: [],
          date: ago(now, 40),
          body: `Dump from the walk. Nothing fancy. The one on the causeway is the keeper.`,
          html: `<p>Dump from the walk. Nothing fancy.</p>
            <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" alt="Causeway" width="480" />
            <img src="https://pixel.facebook.com/tr?id=demo" width="1" height="1" alt="" />`,
          attachments: [],
          tracking: false,
          opens: [],
        },
      ],
    },
  ];
}

export function collectContacts(threads: Thread[]): Person[] {
  const map = new Map<string, Person>();
  for (const t of threads) {
    for (const m of t.messages) {
      for (const p of [m.from, ...m.to, ...m.cc]) {
        if (p.email === ME.email) continue;
        if (!map.has(p.email)) map.set(p.email, p);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

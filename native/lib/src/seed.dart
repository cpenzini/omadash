import 'models.dart';

const _p = {
  'maya': Person(name: 'Maya Chen', email: 'maya@studio.null'),
  'jordan': Person(name: 'Jordan Hale', email: 'jordan@omarchy.org'),
  'priya': Person(name: 'Priya Nair', email: 'priya@northstar.jobs'),
  'sam': Person(name: 'Sam Okonkwo', email: 'sam@flywheel.dev'),
  'elena': Person(name: 'Elena Voss', email: 'elena@cal.local'),
  'luis': Person(name: 'Luis Ortega', email: 'luis@ledger.coop'),
  'riley': Person(name: 'Riley Park', email: 'riley@linuxconf.au'),
  'nora': Person(name: 'Nora Kim', email: 'nora@kernel.studio'),
  'tom': Person(name: 'Tom Becker', email: 'tom@flywheel.dev'),
  'ana': Person(name: 'Ana Silva', email: 'ana@omarchy.org'),
  'github': Person(name: 'GitHub', email: 'notifications@github.com'),
  'linear': Person(name: 'Linear', email: 'noreply@linear.app'),
  'stripe': Person(name: 'Stripe', email: 'receipts@stripe.com'),
  'digest': Person(name: 'Omarchy Digest', email: 'digest@omarchy.org'),
};

DateTime _ago(DateTime now, int hours, [int minutes = 0]) =>
    now.subtract(Duration(hours: hours, minutes: minutes));

List<Thread> buildSeed([DateTime? now]) {
  final n = now ?? DateTime.parse('2026-08-22T05:00:00.000Z');
  Person p(String k) => _p[k]!;

  MailMessage m({
    required String id,
    required Person from,
    required DateTime date,
    required String body,
    List<Person>? to,
    List<Person> cc = const [],
    List<Attachment> attachments = const [],
  }) =>
      MailMessage(
        id: id,
        from: from,
        to: to ?? const [demoMe],
        cc: cc,
        date: date,
        body: body,
        attachments: attachments,
      );

  return [
    Thread(
      id: 't-maya-bar',
      subject: 'Hyprland bar — final pass before freeze',
      folder: Folder.inbox,
      unread: true,
      starred: true,
      focused: true,
      labels: const ['Work'],
      messages: [
        m(
          id: 'm-maya-1',
          from: p('maya'),
          date: _ago(n, 0, 22),
          body:
              'Alex —\n\nAttached is the 1.0 of the bar. I dropped the redundant workspace glyphs and tightened the clock to tabular nums so it doesn\'t jump.\n\nTwo things I want your eye on before we freeze Thursday:\n\n1. The tray overflow still clips on 125% scaling. Repro on a 14" Framework.\n2. The focused-window title truncates mid-glyph in CJK.\n\nIf you have 20 minutes this afternoon I can jump on a call. Otherwise I\'ll ship the first fix tonight.\n\nMaya',
          attachments: const [
            Attachment(name: 'bar-notes.txt', size: '1 KB', mime: 'text/plain'),
            Attachment(name: 'tray-clip.mp4', size: '6.2 MB'),
          ],
        ),
      ],
    ),
    Thread(
      id: 't-tom-pr',
      subject: 'Review: input latency on the compositor shim',
      folder: Folder.inbox,
      unread: true,
      focused: true,
      labels: const ['Work'],
      messages: [
        m(
          id: 'm-tom-1',
          from: p('tom'),
          date: _ago(n, 1, 5),
          cc: [p('sam')],
          body:
              'Need a second pair of eyes on #842 before I merge.\n\nThe shim now batches pointer events per frame instead of per-event syscalls. On my machine p99 input-to-pixel dropped from 18ms → 7ms. I want to make sure I\'m not papering over a race in the seat listener.\n\nPR is ready, tests green, no protocol changes.\n\nTom',
        ),
      ],
    ),
    Thread(
      id: 't-incident',
      subject: 'prod: mail-ingest 5xx between 02:14–02:31 UTC',
      folder: Folder.inbox,
      unread: true,
      focused: true,
      labels: const ['Work'],
      messages: [
        m(
          id: 'm-inc-1',
          from: p('sam'),
          date: _ago(n, 6, 40),
          to: [demoMe, p('tom')],
          body:
              'We took a burst of 502s on ingest. TLS handshake to the upstream MX started failing after the cert rotation. Rolled back the proxy config at 02:27; error rate is flat now.\n\nWriting the postmortem this morning. Alex — can you own the "why didn\'t the canary catch this" section?\n\nSam',
          attachments: const [Attachment(name: 'ingest-5xx.json', size: '88 KB')],
        ),
        m(
          id: 'm-inc-2',
          from: demoMe,
          date: _ago(n, 5, 55),
          to: [p('sam'), p('tom')],
          body:
              'On it. The canary still resolves mx-canary.omarchy.dev to the previous anycast address — I\'ll move it under the same Terraform as prod before standup.\n\nWill have the section in the doc by 10.',
        ),
        m(
          id: 'm-inc-3',
          from: p('tom'),
          date: _ago(n, 5, 10),
          to: [demoMe, p('sam')],
          body:
              'Thanks both. I\'ll add the TLS expiry check to the smoke suite so this class of miss pages us, not the users.\n\nStandup as usual — no need to pull anyone else in.',
        ),
      ],
    ),
    Thread(
      id: 't-jordan',
      subject: 'Omarchy ISO — Monday cut',
      folder: Folder.inbox,
      starred: true,
      focused: true,
      labels: const ['Work'],
      messages: [
        m(
          id: 'm-jordan-1',
          from: p('jordan'),
          date: _ago(n, 8),
          to: [demoMe, p('ana')],
          body:
              'Monday we cut 3.1. The installer now boots to a working Hyprland session in under 40s on the Framework 13, and the theme picker writes gtk + kitty + waybar in one shot.\n\nAlex — can you take the mail-client default? People keep asking for something that\'s as fast as Superhuman and actually lives on this desktop. Keyboard-first, no Electron soup if we can help it.\n\nJordan',
        ),
        m(
          id: 'm-jordan-2',
          from: p('ana'),
          date: _ago(n, 7, 20),
          to: [p('jordan'), demoMe],
          body:
              'I\'ll handle the ISO notes and the mirrored package. Alex, send me the icon URL and the app id you want in omarchy-webapps.toml.\n\nAlso: please don\'t ship a first-run tour that talks for 90 seconds. These users already know J and K.',
        ),
      ],
    ),
    Thread(
      id: 't-elena',
      subject: 'Thursday 2pm — still good?',
      folder: Folder.inbox,
      focused: true,
      labels: const ['Work'],
      messages: [
        m(
          id: 'm-elena-1',
          from: p('elena'),
          date: _ago(n, 11),
          body:
              'Confirming Thursday 2:00–2:30pm Eastern for the Omadash keyboard review.\n\nI\'ll send a Cal link if we need to move it. Agenda is just: shortcuts that feel native on Omarchy, and whether Done vs Archive is the right verb.\n\nElena',
          attachments: const [Attachment(name: 'invite.ics', size: '2 KB')],
        ),
      ],
    ),
    Thread(
      id: 't-priya',
      subject: 'Staff engineer — looping you in',
      folder: Folder.inbox,
      focused: true,
      labels: const ['Waiting'],
      messages: [
        m(
          id: 'm-priya-1',
          from: p('priya'),
          date: _ago(n, 20),
          body:
              'Alex,\n\nI have a staff+ compositor candidate I think you\'d enjoy talking to. Ex-Red Hat, recently on a tiling WM, strong on input latency.\n\nWould you take a 30-minute screen this week?\n\nPriya',
          attachments: const [Attachment(name: 'candidate-packet.pdf', size: '420 KB')],
        ),
      ],
    ),
    Thread(
      id: 't-nora',
      subject: 'Intro: Nora Kim ↔ Alex Rivera',
      folder: Folder.inbox,
      focused: true,
      labels: const ['Personal'],
      messages: [
        m(
          id: 'm-nora-1',
          from: p('nora'),
          date: _ago(n, 28),
          cc: [p('maya')],
          body:
              'Maya suggested I write.\n\nI run a small type foundry — we just cut a monospace meant to sit in a status bar at 11px and still be readable. Thought it might be a fit for Omadash\'s shortcut strip.\n\nHappy to send specimens, or you can ignore this entirely.\n\nNora',
        ),
      ],
    ),
    Thread(
      id: 't-riley',
      subject: 'Your talk is confirmed — Linux.conf',
      folder: Folder.inbox,
      starred: true,
      focused: true,
      labels: const ['Personal'],
      messages: [
        m(
          id: 'm-riley-1',
          from: p('riley'),
          date: _ago(n, 34),
          body:
              'You\'re on Thursday at 11:20 in Hall B.\n\nTitle we have: "Inbox at 120Hz — building a Superhuman-class client for a tiling WM."\n\nSpeaker booth opens 30 minutes prior. HDMI and USB-C both work.\n\nSee you in Adelaide.\n\nRiley',
        ),
      ],
    ),
    Thread(
      id: 't-luis',
      subject: 'Invoice #1842 — August',
      folder: Folder.inbox,
      focused: true,
      labels: const ['Work'],
      messages: [
        m(
          id: 'm-luis-1',
          from: p('luis'),
          date: _ago(n, 46),
          body:
              'August retainer is attached. Net-15 as usual.\n\nLet me know if the "design systems" line should split out from product this month — I can reissue.\n\nLuis',
          attachments: const [Attachment(name: 'INV-1842.pdf', size: '96 KB')],
        ),
      ],
    ),
    Thread(
      id: 't-github',
      subject: '[basecamp/omarchy] 12 notifications',
      folder: Folder.inbox,
      unread: true,
      focused: false,
      messages: [
        m(
          id: 'm-gh-1',
          from: p('github'),
          date: _ago(n, 0, 48),
          body:
              'basecamp/omarchy\n\n• #1900 Terminal based email client — 3 new comments\n• #2144 Default web apps — Jordan Hale requested review\n• dependabot: bump hyprland from 0.51.1 to 0.52.0\n\nView all on GitHub.',
        ),
      ],
    ),
    Thread(
      id: 't-linear',
      subject: 'Alex assigned you 3 issues',
      folder: Folder.inbox,
      unread: true,
      focused: false,
      messages: [
        m(
          id: 'm-lin-1',
          from: p('linear'),
          date: _ago(n, 2, 15),
          body:
              'MAR-184  Shortcut collisions with Hyprland Super+E\nMAR-185  Read-receipt panel density\nMAR-186  Undo toast should not steal focus\n\nDue this week.',
        ),
      ],
    ),
    Thread(
      id: 't-stripe',
      subject: 'Payout of \$4,280 is on the way',
      folder: Folder.inbox,
      focused: false,
      messages: [
        m(
          id: 'm-stripe-1',
          from: p('stripe'),
          date: _ago(n, 9),
          body: 'Your payout of \$4,280.00 is expected to arrive in 2 business days.\n\nStripe Payments.',
        ),
      ],
    ),
    Thread(
      id: 't-digest',
      subject: 'Omarchy weekly — tiling, ISO, mail',
      folder: Folder.inbox,
      focused: false,
      messages: [
        m(
          id: 'm-digest-1',
          from: p('digest'),
          date: _ago(n, 30),
          body:
              'This week: Hyprland 0.52, the ISO freeze, and a roundup of keyboard-first Linux apps. Omadash is mentioned twice. You already knew that.',
        ),
      ],
    ),
  ];
}

List<CalEvent> buildCalendarSeed([DateTime? now]) {
  final n = now ?? DateTime.now();
  final day = DateTime(n.year, n.month, n.day);
  DateTime at(int h, [int m = 0]) => DateTime(day.year, day.month, day.day, h, m);
  return [
    CalEvent(
      id: 'c-standup',
      title: 'Standup',
      start: at(10),
      end: at(10, 15),
      who: 'You',
    ),
    CalEvent(
      id: 'c-bar',
      title: 'Hyprland bar freeze',
      start: at(14),
      end: at(14, 30),
      where: 'Call',
      who: 'Maya Chen',
      threadId: 't-maya-bar',
    ),
    CalEvent(
      id: 'c-talk',
      title: 'Linux.conf talk — Hall B',
      start: at(11, 20).add(const Duration(days: 2)),
      end: at(12).add(const Duration(days: 2)),
      where: 'Adelaide',
      who: 'Riley Park',
      threadId: 't-riley',
    ),
  ];
}

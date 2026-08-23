import 'package:flutter/services.dart';
import 'package:flutter_omarchy/flutter_omarchy.dart';
import 'package:intl/intl.dart';

import '../app.dart';
import '../imap.dart';
import '../keys.dart';
import '../models.dart';
import '../store.dart';

class MailShell extends StatefulWidget {
  const MailShell({super.key});

  @override
  State<MailShell> createState() => _MailShellState();
}

class _MailShellState extends State<MailShell> {
  final _focus = FocusNode();

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  void _commandPanel(BuildContext context, MailStore store) {
    final items = <_Cmd>[
      _Cmd('Compose', 'C', () => store.openCompose()),
      _Cmd('Inbox', 'G I', () => store.setFolder(Folder.inbox)),
      _Cmd('Starred', 'G S', () => store.setFolder(Folder.starred)),
      _Cmd('Done', 'G E', () => store.setFolder(Folder.done)),
      _Cmd('Trash', 'G #', () => store.setFolder(Folder.trash)),
      _Cmd('Calendar', '3', () => store.setCalendarOpen(true)),
      _Cmd('Connect mailbox', 'G P', () => store.setConnectOpen(true)),
      _Cmd('Sync', 'R', () => store.sync()),
      _Cmd('Use local mailbox', '', () => store.useDemo()),
      _Cmd('Keyboard reference', '?', () => store.setShortcutsOpen(true)),
      ...store.threads.take(40).map(
            (t) => _Cmd(
              t.subject,
              t.latest.from.name,
              () {
                store.setFolder(t.folder);
                store.select(t.id);
              },
            ),
          ),
    ];
    showOmarchyCommandPanel<_Cmd>(
      context: context,
      placeholder: 'Search or jump…',
      items: items,
      filter: (q, all) {
        final n = q.toLowerCase();
        return all.where((c) => '${c.title} ${c.hint}'.toLowerCase().contains(n)).toList();
      },
      resultBuilder: (context, item, selected, onTap) => OmarchyTile(
        title: Text(item.title),
        description: item.hint.isEmpty ? null : Text(item.hint),
        onTap: onTap,
      ),
      onItemSelected: (item) => item.run(),
    );
  }

  KeyEventResult _onKey(BuildContext context, MailStore store, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final meta = HardwareKeyboard.instance.isControlPressed ||
        HardwareKeyboard.instance.isMetaPressed;
    final label = event.character ?? event.logicalKey.keyLabel;
    final typing = isTyping(context) || store.compose != null || store.connectOpen;

    if ((meta && label.toLowerCase() == 'k') || (label == '/' && !typing && !HardwareKeyboard.instance.isShiftPressed)) {
      _commandPanel(context, store);
      return KeyEventResult.handled;
    }
    if (handleKey(event, store, typing: typing)) {
      final flash = store.flash;
      if (flash != null && mounted) {
        showOmarchyToast(context: context, message: Text(flash), accent: AnsiColor.white);
      }
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final theme = OmarchyTheme.of(context);
        return Focus(
          autofocus: true,
          focusNode: _focus,
          onKeyEvent: (node, event) => _onKey(context, store, event),
          child: OmarchyScaffold(
            panelInitialSize: const PanelSize.absolute(220),
            minPanelSize: const PanelSize.absolute(180),
            maxPanelSize: const PanelSize.absolute(280),
            hideLeadingMenuUnderWidth: 720,
            leadingPanel: const _Sidebar(),
            navigationBar: OmarchyNavigationBar(
              title: Text(
                store.calendarOpen
                    ? 'Calendar'
                    : folders.firstWhere((f) => f.id == store.folder).label,
              ),
              leading: [
                OmarchyButton(
                  onPressed: () {
                    final menu = OmarchyScaffold.leadingPanelMaybeOf(context);
                    if (menu != null && menu.isHidden) {
                      menu.hiddenController.isVisible = true;
                    }
                  },
                  child: const Icon(OmarchyIcons.codMenu),
                ),
              ],
              trailing: [
                OmarchyButton(
                  onPressed: () => _commandPanel(context, store),
                  child: const Icon(OmarchyIcons.codSearch),
                ),
                OmarchyButton(
                  onPressed: () => store.openCompose(),
                  child: const Icon(OmarchyIcons.codAdd),
                ),
                OmarchyButton(
                  onPressed: () => store.setCalendarOpen(!store.calendarOpen),
                  child: const Icon(OmarchyIcons.codCalendar),
                ),
              ],
            ),
            status: OmarchyStatusBar(
              leading: [
                OmarchyStatus(
                  accent: store.lastError != null
                      ? AnsiColor.red
                      : store.source == MailSource.imap
                          ? AnsiColor.green
                          : AnsiColor.white,
                  child: Text(
                    store.syncing
                        ? 'syncing'
                        : store.source == MailSource.imap
                            ? store.me.email
                            : 'local · ${store.me.email}',
                  ),
                ),
                OmarchyStatus(
                  child: Text('${store.visible.length} threads'),
                ),
                if (store.goArmed)
                  const OmarchyStatus(
                    accent: AnsiColor.cyan,
                    child: Text('G …'),
                  ),
              ],
              trailing: [
                OmarchyStatus(
                  child: Text('${store.unreadIn(Folder.inbox)} unread'),
                ),
                const OmarchyStatus(child: Text('? keys · 0.2.0')),
              ],
            ),
            child: Stack(
              children: [
                ColoredBox(
                  color: theme.colors.background,
                  child: store.calendarOpen
                      ? const _CalendarPane()
                      : OmarchySplitPanel(
                          panelInitialSize: const PanelSize.ratio(0.38),
                          minPanelSize: const PanelSize.absolute(260),
                          panel: const _ThreadList(),
                          child: const _ReadingPane(),
                        ),
                ),
                if (store.onboarding) const _Onboarding(),
                if (store.compose != null) const _Compose(),
                if (store.connectOpen) const _Connect(),
                if (store.shortcutsOpen) const _Shortcuts(),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Cmd {
  const _Cmd(this.title, this.hint, this.run);
  final String title;
  final String hint;
  final VoidCallback run;
  @override
  String toString() => '$title $hint';
}

class _Sidebar extends StatelessWidget {
  const _Sidebar();

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    final theme = OmarchyTheme.of(context);
    return ColoredBox(
      color: theme.colors.background,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Text(appName, style: theme.text.bold.copyWith(fontSize: 18)),
                const SizedBox(width: 8),
                Text(
                  'Omarchy',
                  style: theme.text.italic.copyWith(color: theme.colors.bright.black),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: OmarchyButton(
              style: OmarchyButtonStyle.filled(AnsiColor.white),
              onPressed: () => store.openCompose(),
              child: const Text('Compose   C'),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView(
              children: [
                for (final f in folders)
                  Selected(
                    isSelected: store.folder == f.id && !store.calendarOpen,
                    child: OmarchyTile(
                      title: Text(f.label),
                      trailing: Text(
                        '${store.count(f.id)}',
                        style: theme.text.normal.copyWith(
                          color: theme.colors.bright.black,
                          fontSize: 12,
                        ),
                      ),
                      onTap: () => store.setFolder(f.id),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    'SPLIT',
                    style: theme.text.bold.copyWith(
                      color: theme.colors.bright.black,
                      fontSize: 11,
                    ),
                  ),
                ),
                Selected(
                  isSelected: store.split == Split.focused && !store.calendarOpen,
                  child: OmarchyTile(
                    title: const Text('Focused'),
                    onTap: () => store.setSplit(Split.focused),
                  ),
                ),
                Selected(
                  isSelected: store.split == Split.other && !store.calendarOpen,
                  child: OmarchyTile(
                    title: const Text('Other'),
                    onTap: () => store.setSplit(Split.other),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    'DAY',
                    style: theme.text.bold.copyWith(
                      color: theme.colors.bright.black,
                      fontSize: 11,
                    ),
                  ),
                ),
                Selected(
                  isSelected: store.calendarOpen,
                  child: OmarchyTile(
                    leading: const Icon(OmarchyIcons.codCalendar),
                    title: const Text('Calendar'),
                    trailing: const Text('3'),
                    onTap: () => store.setCalendarOpen(true),
                  ),
                ),
              ],
            ),
          ),
          OmarchyDivider(),
          OmarchyTile(
            title: Text(store.source == MailSource.imap ? store.me.email : 'Local mailbox'),
            description: Text(store.source == MailSource.imap ? 'IMAP' : 'Demo · compile to connect'),
            onTap: () => store.setConnectOpen(true),
          ),
        ],
      ),
    );
  }
}

class _ThreadList extends StatelessWidget {
  const _ThreadList();

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    final theme = OmarchyTheme.of(context);
    final list = store.visible;
    if (list.isEmpty) {
      return Center(
        child: Text(
          'Zero. ${store.folder == Folder.inbox ? 'C to compose.' : 'G then I for inbox.'}',
          style: theme.text.italic.copyWith(color: theme.colors.bright.black),
        ),
      );
    }
    return Column(
      children: [
        if (store.folder == Folder.inbox)
          Container(
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: theme.colors.border)),
            ),
            child: Row(
              children: [
                _SplitTab(
                  label: 'Focused',
                  selected: store.split == Split.focused,
                  onTap: () => store.setSplit(Split.focused),
                ),
                _SplitTab(
                  label: 'Other',
                  selected: store.split == Split.other,
                  onTap: () => store.setSplit(Split.other),
                ),
              ],
            ),
          ),
        Expanded(
          child: ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final t = list[i];
              final on = t.id == store.selectedId;
              return Selected(
                isSelected: on,
                child: _ThreadRow(thread: t, selected: on),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _SplitTab extends StatelessWidget {
  const _SplitTab({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = OmarchyTheme.of(context);
    return Expanded(
      child: PointerArea(
        onTap: onTap,
        builder: (context, state, _) => Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: selected ? theme.colors.foreground : theme.colors.border,
                width: selected ? 2 : 1,
              ),
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: (selected ? theme.text.bold : theme.text.normal).copyWith(
                color: selected ? theme.colors.foreground : theme.colors.bright.black,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ThreadRow extends StatelessWidget {
  const _ThreadRow({required this.thread, required this.selected});
  final Thread thread;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    final theme = OmarchyTheme.of(context);
    final muted = theme.colors.bright.black;
    return PointerArea(
      onTap: () => store.select(thread.id),
      builder: (context, state, _) {
        final bg = selected
            ? theme.colors.normal.black
            : state.isHovering
                ? theme.colors.normal.black.withValues(alpha: 0.4)
                : theme.colors.background;
        return Container(
          color: bg,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 6, right: 10),
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: thread.unread ? theme.colors.bright.blue : const Color(0x00000000),
                  ),
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            thread.latest.from.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: (thread.unread ? theme.text.bold : theme.text.normal)
                                .copyWith(color: theme.colors.foreground),
                          ),
                        ),
                        Text(
                          relative(thread.latestDate),
                          style: theme.text.normal.copyWith(color: muted, fontSize: 12),
                        ),
                      ],
                    ),
                    Text(
                      thread.subject,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.text.normal.copyWith(
                        color: thread.unread ? theme.colors.foreground : muted,
                      ),
                    ),
                    Text(
                      thread.latest.snippet,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.text.italic.copyWith(color: muted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (thread.starred)
                Padding(
                  padding: const EdgeInsets.only(left: 8, top: 2),
                  child: Icon(OmarchyIcons.codStarFull, size: 14, color: theme.colors.bright.yellow),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _ReadingPane extends StatelessWidget {
  const _ReadingPane();

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    final theme = OmarchyTheme.of(context);
    final t = store.selected;
    if (t == null) {
      return Center(
        child: Text(
          'J and K move the list. Enter opens. E is done.',
          style: theme.text.italic.copyWith(color: theme.colors.bright.black),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(24, 18, 24, 12),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: theme.colors.border)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t.subject, style: theme.text.bold.copyWith(fontSize: 20)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OmarchyButton(
                    onPressed: () => store.openCompose(reply: t),
                    child: const Text('Reply  R'),
                  ),
                  OmarchyButton(
                    onPressed: () => store.openCompose(reply: t, replyAll: true),
                    child: const Text('Reply all'),
                  ),
                  OmarchyButton(
                    onPressed: store.archive,
                    child: const Text('Done  E'),
                  ),
                  OmarchyButton(
                    onPressed: store.trash,
                    child: const Text('Trash  #'),
                  ),
                  OmarchyButton(
                    onPressed: store.star,
                    child: Text(t.starred ? 'Unstar' : 'Star  S'),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 48),
            itemCount: t.messages.length,
            separatorBuilder: (_, __) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: OmarchyDivider(),
            ),
            itemBuilder: (context, i) {
              final m = t.messages[i];
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _Avatar(name: m.from.name),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(m.from.name, style: theme.text.bold),
                            Text(
                              m.from.email,
                              style: theme.text.normal.copyWith(
                                color: theme.colors.bright.black,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        DateFormat('EEE, MMM d · h:mm a').format(m.date.toLocal()),
                        style: theme.text.normal.copyWith(
                          color: theme.colors.bright.black,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SelectableText(
                    m.body,
                    style: theme.text.normal.copyWith(height: 1.5),
                  ),
                  if (m.attachments.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final a in m.attachments)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              border: Border.all(color: theme.colors.border),
                            ),
                            child: Text(
                              '${a.name}  ${a.size}',
                              style: theme.text.normal.copyWith(fontSize: 12),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    final theme = OmarchyTheme.of(context);
    final initials = Person(name: name, email: '').initials;
    return Container(
      width: 32,
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: theme.colors.normal.black,
        border: Border.all(color: theme.colors.border),
      ),
      child: Text(initials, style: theme.text.bold.copyWith(fontSize: 12)),
    );
  }
}

class _Onboarding extends StatelessWidget {
  const _Onboarding();

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    final theme = OmarchyTheme.of(context);
    return Align(
      alignment: Alignment.bottomLeft,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: theme.colors.background,
              border: Border.all(color: theme.colors.border, width: 2),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$appVersion · Flutter native',
                  style: theme.text.normal.copyWith(
                    color: theme.colors.bright.black,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 4),
                Text(appName, style: theme.text.bold.copyWith(fontSize: 18)),
                const SizedBox(height: 6),
                Text(
                  '$appTagline Compile on Omarchy for live IMAP. J and K move the list.',
                  style: theme.text.normal.copyWith(color: theme.colors.bright.black),
                ),
                const SizedBox(height: 14),
                OmarchyButton(
                  style: OmarchyButtonStyle.filled(AnsiColor.white),
                  onPressed: store.dismissOnboarding,
                  child: const Text('Open the inbox'),
                ),
                const SizedBox(height: 8),
                OmarchyButton(
                  onPressed: () {
                    store.dismissOnboarding();
                    store.setConnectOpen(true);
                  },
                  child: const Text('Connect a real mailbox'),
                ),
                const SizedBox(height: 8),
                OmarchyButton(
                  onPressed: () {
                    store.dismissOnboarding();
                    store.setCalendarOpen(true);
                  },
                  child: const Text('Open calendar'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Compose extends StatefulWidget {
  const _Compose();

  @override
  State<_Compose> createState() => _ComposeState();
}

class _ComposeState extends State<_Compose> {
  late final TextEditingController to;
  late final TextEditingController subject;
  late final TextEditingController body;
  var _ready = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_ready) return;
    final d = MailScope.of(context).compose!;
    to = TextEditingController(text: d.to);
    subject = TextEditingController(text: d.subject);
    body = TextEditingController(text: d.body);
    to.addListener(_sync);
    subject.addListener(_sync);
    body.addListener(_sync);
    _ready = true;
  }

  void _sync() {
    final d = MailScope.of(context).compose;
    if (d == null) return;
    d.to = to.text;
    d.subject = subject.text;
    d.body = body.text;
  }

  @override
  void dispose() {
    to.dispose();
    subject.dispose();
    body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    final theme = OmarchyTheme.of(context);
    return ColoredBox(
      color: theme.colors.normal.black.withValues(alpha: 0.55),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640, maxHeight: 560),
          child: Container(
            margin: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: theme.colors.background,
              border: Border.all(color: theme.colors.border, width: 2),
            ),
            child: Column(
              children: [
                OmarchyNavigationBar(
                  title: const Text('Compose'),
                  trailing: [
                    OmarchyButton(
                      onPressed: store.closeCompose,
                      child: const Text('Esc'),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: OmarchyTextInput(
                    controller: to,
                    placeholder: const Text('To'),
                    autofocus: true,
                  ),
                ),
                OmarchyDivider(),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: OmarchyTextInput(
                    controller: subject,
                    placeholder: const Text('Subject'),
                  ),
                ),
                OmarchyDivider(),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: OmarchyTextInput(
                      controller: body,
                      maxLines: null,
                      expands: true,
                      placeholder: const Text('Write. Ctrl+Enter sends.'),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      OmarchyButton(
                        style: OmarchyButtonStyle.filled(AnsiColor.white),
                        onPressed: () => store.send(),
                        child: const Text('Send  Ctrl+Enter'),
                      ),
                      const SizedBox(width: 8),
                      OmarchyButton(
                        onPressed: store.closeCompose,
                        child: const Text('Discard'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Connect extends StatefulWidget {
  const _Connect();

  @override
  State<_Connect> createState() => _ConnectState();
}

class _ConnectState extends State<_Connect> {
  ProviderPreset preset = presets.first;
  final email = TextEditingController();
  final password = TextEditingController();
  final name = TextEditingController(text: 'Alex Rivera');
  final imapHost = TextEditingController();
  final smtpHost = TextEditingController();

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    name.dispose();
    imapHost.dispose();
    smtpHost.dispose();
    super.dispose();
  }

  Future<void> _go() async {
    final store = MailScope.of(context);
    final account = ImapAccount(
      email: email.text.trim(),
      name: name.text.trim().isEmpty ? email.text.trim().split('@').first : name.text.trim(),
      provider: preset.id,
      imapHost: preset.imapHost.isEmpty ? imapHost.text.trim() : preset.imapHost,
      imapPort: preset.imapPort,
      smtpHost: preset.smtpHost.isEmpty ? smtpHost.text.trim() : preset.smtpHost,
      smtpPort: preset.smtpPort,
      smtpSecure: preset.smtpSecure,
    );
    await store.connectImap(account: account, password: password.text);
    if (!mounted) return;
    final err = store.lastError;
    if (err != null) {
      showOmarchyToast(context: context, message: Text(err), accent: AnsiColor.red);
    } else if (store.flash != null) {
      showOmarchyToast(
        context: context,
        message: Text(store.flash!),
        accent: AnsiColor.green,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    final theme = OmarchyTheme.of(context);
    return ColoredBox(
      color: theme.colors.normal.black.withValues(alpha: 0.55),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: theme.colors.background,
              border: Border.all(color: theme.colors.border, width: 2),
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  OmarchyNavigationBar(
                    title: const Text('Connect mailbox'),
                    trailing: [
                      OmarchyButton(
                        onPressed: () => store.setConnectOpen(false),
                        child: const Text('Esc'),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Text(
                      'Live IMAP in this binary. App password, not your account password. Credentials stay on this machine.',
                      style: theme.text.normal.copyWith(color: theme.colors.bright.black),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Wrap(
                      spacing: 8,
                      children: [
                        for (final p in presets)
                          OmarchyButton(
                            style: preset.id == p.id
                                ? OmarchyButtonStyle.filled(AnsiColor.white)
                                : OmarchyButtonStyle.outline(AnsiColor.white),
                            onPressed: () => setState(() => preset = p),
                            child: Text(p.label),
                          ),
                      ],
                    ),
                  ),
                  if (preset.hint != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                      child: Text(
                        preset.hint!,
                        style: theme.text.italic.copyWith(color: theme.colors.bright.yellow),
                      ),
                    ),
                  _field(email, 'Email'),
                  _field(password, 'App password', obscure: true),
                  _field(name, 'Your name'),
                  if (preset.id == 'generic') ...[
                    _field(imapHost, 'IMAP host'),
                    _field(smtpHost, 'SMTP host'),
                  ],
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Row(
                      children: [
                        OmarchyButton(
                          style: OmarchyButtonStyle.filled(AnsiColor.green),
                          onPressed: store.syncing ? null : _go,
                          child: Text(store.syncing ? 'Connecting…' : 'Connect'),
                        ),
                        const SizedBox(width: 8),
                        OmarchyButton(
                          onPressed: () => store.useDemo(),
                          child: const Text('Use local mailbox'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String hint, {bool obscure = false}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: OmarchyTextInput(
        controller: c,
        obscureText: obscure,
        placeholder: Text(hint),
      ),
    );
  }
}

class _CalendarPane extends StatelessWidget {
  const _CalendarPane();

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    final theme = OmarchyTheme.of(context);
    final events = [...store.events]..sort((a, b) => a.start.compareTo(b.start));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
          child: Row(
            children: [
              Text('Today', style: theme.text.bold.copyWith(fontSize: 20)),
              const Spacer(),
              Text(
                DateFormat('EEEE, MMMM d').format(DateTime.now()),
                style: theme.text.normal.copyWith(color: theme.colors.bright.black),
              ),
            ],
          ),
        ),
        Expanded(
          child: events.isEmpty
              ? Center(
                  child: Text(
                    'No events. Esc back to mail.',
                    style: theme.text.italic.copyWith(color: theme.colors.bright.black),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  itemCount: events.length,
                  itemBuilder: (context, i) {
                    final e = events[i];
                    return OmarchyTile(
                      title: Text(e.title),
                      description: Text(
                        [
                          DateFormat('EEE h:mm a').format(e.start.toLocal()),
                          if (e.where != null) e.where,
                          if (e.who != null) e.who,
                        ].join(' · '),
                      ),
                      leading: Icon(
                        OmarchyIcons.codCalendar,
                        color: theme.colors.bright.cyan,
                      ),
                      onTap: e.threadId == null
                          ? null
                          : () {
                              store.setCalendarOpen(false);
                              store.select(e.threadId);
                            },
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _Shortcuts extends StatelessWidget {
  const _Shortcuts();

  @override
  Widget build(BuildContext context) {
    final store = MailScope.of(context);
    final theme = OmarchyTheme.of(context);
    const rows = [
      ('J / K', 'Next / previous thread'),
      ('Enter / O', 'Open'),
      ('E', 'Done'),
      ('#', 'Trash'),
      ('C', 'Compose'),
      ('R / Shift+R', 'Reply / reply all'),
      ('S', 'Star'),
      ('U', 'Undo'),
      ('Z', 'Toggle unread'),
      ('Ctrl+K  /', 'Command palette'),
      ('Ctrl+Enter', 'Send'),
      ('G then I / C / P', 'Inbox / calendar / connect'),
      ('3', 'Calendar'),
      ('Tab', 'Focused / Other'),
      ('?', 'This sheet'),
    ];
    return ColoredBox(
      color: theme.colors.normal.black.withValues(alpha: 0.55),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Container(
            margin: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: theme.colors.background,
              border: Border.all(color: theme.colors.border, width: 2),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                OmarchyNavigationBar(
                  title: const Text('Keys'),
                  trailing: [
                    OmarchyButton(
                      onPressed: () => store.setShortcutsOpen(false),
                      child: const Text('Esc'),
                    ),
                  ],
                ),
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
                    children: [
                      for (final r in rows)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 140,
                                child: Text(r.$1, style: theme.text.bold),
                              ),
                              Expanded(
                                child: Text(
                                  r.$2,
                                  style: theme.text.normal.copyWith(color: theme.colors.bright.black),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String relative(DateTime date) {
  final now = DateTime.now();
  final d = date.toLocal();
  final diff = now.difference(d);
  if (diff.inMinutes < 1) return 'now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m';
  if (diff.inHours < 24 && now.day == d.day) return DateFormat.jm().format(d);
  if (diff.inDays < 6) return DateFormat.E().format(d);
  return DateFormat.MMMd().format(d);
}

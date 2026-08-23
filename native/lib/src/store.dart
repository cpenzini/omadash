import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'imap.dart';
import 'models.dart';
import 'seed.dart';

class UndoFrame {
  UndoFrame(this.label, this.threads);
  final String label;
  final List<Thread> threads;
}

class MailStore extends ChangeNotifier {
  MailStore({MailboxGateway? gateway, List<Thread>? seed})
      : _gateway = gateway ?? MailboxGateway(),
        threads = seed ?? buildSeed();

  final MailboxGateway _gateway;

  List<Thread> threads;
  List<CalEvent> events = buildCalendarSeed();
  Folder folder = Folder.inbox;
  Split split = Split.focused;
  String? selectedId;
  String query = '';
  bool calendarOpen = false;
  bool connectOpen = false;
  bool shortcutsOpen = false;
  bool onboarding = true;
  MailSource source = MailSource.demo;
  Person me = demoMe;
  ImapAccount? account;
  String? password;
  bool syncing = false;
  String? lastError;
  String? flash;
  ComposeDraft? compose;
  final List<UndoFrame> _undo = [];
  DateTime? _goUntil;
  bool _hydrated = false;

  bool get goArmed => _goUntil != null && DateTime.now().isBefore(_goUntil!);
  bool get hydrated => _hydrated;
  bool get overlayOpen =>
      compose != null || calendarOpen || connectOpen || shortcutsOpen || onboarding;

  List<Thread> get visible {
    final q = query.trim().toLowerCase();
    return threads.where((t) {
      if (folder == Folder.starred) {
        if (!t.starred) return false;
      } else if (t.folder != folder) {
        return false;
      }
      if (folder == Folder.inbox && q.isEmpty) {
        if (split == Split.focused && !t.focused) return false;
        if (split == Split.other && t.focused) return false;
      }
      if (q.isEmpty) return true;
      final blob = '${t.subject} ${t.latest.from.name} ${t.latest.from.email} ${t.latest.body}'
          .toLowerCase();
      return blob.contains(q);
    }).toList()
      ..sort((a, b) => b.latestDate.compareTo(a.latestDate));
  }

  Thread? get selected {
    final id = selectedId;
    if (id == null) return null;
    return threads.cast<Thread?>().firstWhere((t) => t!.id == id, orElse: () => null);
  }

  int unreadIn(Folder f) =>
      threads.where((t) => t.folder == f && t.unread).length;

  int count(Folder f) => f == Folder.starred
      ? threads.where((t) => t.starred).length
      : threads.where((t) => t.folder == f).length;

  Future<void> hydrate() async {
    final prefs = await SharedPreferences.getInstance();
    onboarding = prefs.getBool('omadash.onboard') ?? true;
    try {
      final saved = await _gateway.loadSaved();
      if (saved != null) {
        account = saved.account;
        password = saved.password;
        me = Person(name: saved.account.name, email: saved.account.email);
        source = MailSource.imap;
        await sync();
      }
    } catch (e) {
      lastError = e.toString();
      source = MailSource.demo;
    }
    _ensureSelection();
    _hydrated = true;
    notifyListeners();
  }

  void dismissOnboarding() {
    onboarding = false;
    SharedPreferences.getInstance().then((p) => p.setBool('omadash.onboard', false));
    notifyListeners();
  }

  void setFolder(Folder f) {
    folder = f;
    calendarOpen = false;
    _ensureSelection();
    notifyListeners();
  }

  void setSplit(Split s) {
    split = s;
    _ensureSelection();
    notifyListeners();
  }

  void setQuery(String q) {
    query = q;
    _ensureSelection();
    notifyListeners();
  }

  void select(String? id) {
    selectedId = id;
    final t = selected;
    if (t != null && t.unread) {
      t.unread = false;
      _fireImapSeen(t, true);
    }
    notifyListeners();
  }

  void selectDelta(int delta) {
    final list = visible;
    if (list.isEmpty) return;
    final i = list.indexWhere((t) => t.id == selectedId);
    final next = (i < 0 ? 0 : i + delta).clamp(0, list.length - 1);
    select(list[next].id);
  }

  void armGo() {
    _goUntil = DateTime.now().add(const Duration(milliseconds: 900));
    notifyListeners();
  }

  void clearGo() {
    _goUntil = null;
  }

  void setCalendarOpen(bool v) {
    calendarOpen = v;
    notifyListeners();
  }

  void setConnectOpen(bool v) {
    connectOpen = v;
    notifyListeners();
  }

  void setShortcutsOpen(bool v) {
    shortcutsOpen = v;
    notifyListeners();
  }

  void openCompose({Thread? reply, bool replyAll = false, bool forward = false}) {
    if (reply == null) {
      compose = ComposeDraft();
    } else {
      final last = reply.latest;
      final to = replyAll
          ? [
              last.from.email,
              ...last.to.map((p) => p.email),
              ...last.cc.map((p) => p.email),
            ].where((e) => e != me.email).toSet().join(', ')
          : last.from.email;
      final quoted = last.body.split('\n').map((l) => '> $l').join('\n');
      compose = ComposeDraft(
        to: forward ? '' : to,
        subject: _re(reply.subject, forward: forward),
        body: '\n\nOn ${_fmt(last.date)} ${last.from.name} wrote:\n$quoted',
        threadId: reply.id,
        replyAll: replyAll,
      );
    }
    notifyListeners();
  }

  void closeCompose() {
    compose = null;
    notifyListeners();
  }

  Future<void> send() async {
    final d = compose;
    if (d == null) return;
    if (d.to.trim().isEmpty) {
      flash = 'Need a recipient';
      notifyListeners();
      return;
    }
    final id = 't-out-${DateTime.now().microsecondsSinceEpoch}';
    final msg = MailMessage(
      id: '$id-0',
      from: me,
      to: d.to.split(RegExp(r'[,;]')).where((s) => s.contains('@')).map((s) {
        final e = s.trim();
        return Person(name: e.split('@').first, email: e);
      }).toList(),
      date: DateTime.now(),
      body: d.body,
    );
    threads.insert(
      0,
      Thread(
        id: id,
        subject: d.subject.isEmpty ? '(no subject)' : d.subject,
        folder: Folder.sent,
        messages: [msg],
        focused: true,
      ),
    );
    compose = null;
    flash = 'Sent';
    notifyListeners();

    if (source == MailSource.imap && account != null && password != null) {
      try {
        await _gateway.send(
          account: account!,
          password: password!,
          from: me,
          to: d.to,
          cc: d.cc,
          subject: d.subject,
          body: d.body,
        );
      } catch (e) {
        lastError = 'Send failed: $e';
        flash = lastError;
        notifyListeners();
      }
    }
  }

  void archive() => _moveSelected(Folder.done, 'Done');
  void trash() => _moveSelected(Folder.trash, 'Trashed');

  void star() {
    final t = selected;
    if (t == null) return;
    t.starred = !t.starred;
    flash = t.starred ? 'Starred' : 'Unstarred';
    notifyListeners();
  }

  void toggleUnread() {
    final t = selected;
    if (t == null) return;
    t.unread = !t.unread;
    _fireImapSeen(t, !t.unread);
    flash = t.unread ? 'Unread' : 'Read';
    notifyListeners();
  }

  void undo() {
    if (_undo.isEmpty) return;
    final frame = _undo.removeLast();
    threads = frame.threads.map((t) => _clone(t)).toList();
    flash = 'Undone · ${frame.label}';
    _ensureSelection();
    notifyListeners();
  }

  void _moveSelected(Folder dest, String label) {
    final t = selected;
    if (t == null) return;
    _pushUndo(label);
    final list = visible;
    final i = list.indexWhere((x) => x.id == t.id);
    t.folder = dest;
    t.unread = false;
    _fireImapMove(t, dest);
    final next = visible;
    if (next.isEmpty) {
      selectedId = null;
    } else {
      selectedId = next[(i.clamp(0, next.length - 1))].id;
    }
    flash = label;
    notifyListeners();
  }

  void _pushUndo(String label) {
    _undo.add(UndoFrame(label, threads.map(_clone).toList()));
    if (_undo.length > 20) _undo.removeAt(0);
  }

  Thread _clone(Thread t) => Thread.fromJson(jsonDecode(jsonEncode(t.toJson())) as Map<String, dynamic>);

  void _ensureSelection() {
    final list = visible;
    if (list.isEmpty) {
      selectedId = null;
      return;
    }
    if (selectedId == null || !list.any((t) => t.id == selectedId)) {
      selectedId = list.first.id;
    }
  }

  Future<void> connectImap({
    required ImapAccount account,
    required String password,
  }) async {
    syncing = true;
    lastError = null;
    notifyListeners();
    try {
      await _gateway.connect(account, password);
      await _gateway.saveAccount(account, password);
      this.account = account;
      this.password = password;
      me = Person(name: account.name, email: account.email);
      source = MailSource.imap;
      connectOpen = false;
      onboarding = false;
      final remote = await _gateway.fetchInbox();
      if (remote.isNotEmpty) threads = remote;
      folder = Folder.inbox;
      _ensureSelection();
      flash = 'Connected ${account.email}';
    } catch (e) {
      lastError = _friendly(e);
      flash = lastError;
    } finally {
      syncing = false;
      notifyListeners();
    }
  }

  Future<void> sync() async {
    if (account == null || password == null) return;
    syncing = true;
    lastError = null;
    notifyListeners();
    try {
      await _gateway.connect(account!, password!);
      final remote = await _gateway.fetchInbox();
      threads = remote;
      source = MailSource.imap;
      _ensureSelection();
      flash = 'Synced ${remote.length} threads';
    } catch (e) {
      lastError = _friendly(e);
      flash = lastError;
    } finally {
      syncing = false;
      notifyListeners();
    }
  }

  Future<void> useDemo() async {
    await _gateway.clear();
    account = null;
    password = null;
    source = MailSource.demo;
    me = demoMe;
    threads = buildSeed();
    events = buildCalendarSeed();
    folder = Folder.inbox;
    connectOpen = false;
    _ensureSelection();
    flash = 'Local mailbox ready';
    notifyListeners();
  }

  Future<void> disconnect() async {
    await _gateway.clear();
    await useDemo();
    flash = 'Disconnected';
    notifyListeners();
  }

  void _fireImapSeen(Thread t, bool seen) {
    final uid = t.latest.imapUid;
    if (source != MailSource.imap || uid == null) return;
    unawaited(() async {
      try {
        await _gateway.markSeen(uid, seen: seen);
      } catch (_) {}
    }());
  }

  void _fireImapMove(Thread t, Folder dest) {
    final uid = t.latest.imapUid;
    if (source != MailSource.imap || uid == null) return;
    final box = switch (dest) {
      Folder.trash => 'Trash',
      Folder.done => 'Archive',
      Folder.sent => 'Sent',
      _ => 'INBOX',
    };
    unawaited(() async {
      try {
        await _gateway.move(uid, box);
      } catch (_) {}
    }());
  }

  String _friendly(Object e) {
    final s = e.toString();
    if (s.contains('AUTHENTICATIONFAILED') || s.toLowerCase().contains('auth')) {
      return 'Login failed. Gmail and iCloud need an app password.';
    }
    if (s.toLowerCase().contains('socket') || s.toLowerCase().contains('connection')) {
      return 'Could not reach the mail server.';
    }
    return s.replaceFirst('Exception: ', '');
  }

  String _re(String subject, {required bool forward}) {
    final s = subject.trim();
    if (forward) return s.toLowerCase().startsWith('fwd:') ? s : 'Fwd: $s';
    if (s.toLowerCase().startsWith('re:')) return s;
    return 'Re: $s';
  }

  String _fmt(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  void dispose() {
    _gateway.disconnect();
    super.dispose();
  }
}

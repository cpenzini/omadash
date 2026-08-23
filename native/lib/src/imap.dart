import 'package:enough_mail/enough_mail.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

const _kEmail = 'omadash.imap.email';
const _kName = 'omadash.imap.name';
const _kProvider = 'omadash.imap.provider';
const _kImapHost = 'omadash.imap.host';
const _kImapPort = 'omadash.imap.port';
const _kSmtpHost = 'omadash.smtp.host';
const _kSmtpPort = 'omadash.smtp.port';
const _kSmtpSecure = 'omadash.smtp.secure';
const _kUser = 'omadash.imap.user';
const _kPass = 'omadash.imap.pass';

class ProviderPreset {
  const ProviderPreset({
    required this.id,
    required this.label,
    required this.imapHost,
    required this.imapPort,
    required this.smtpHost,
    required this.smtpPort,
    required this.smtpSecure,
    this.hint,
  });

  final String id;
  final String label;
  final String imapHost;
  final int imapPort;
  final String smtpHost;
  final int smtpPort;
  final bool smtpSecure;
  final String? hint;
}

const presets = [
  ProviderPreset(
    id: 'gmail',
    label: 'Gmail',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    hint: 'Use an app password, not your Google password.',
  ),
  ProviderPreset(
    id: 'fastmail',
    label: 'Fastmail',
    imapHost: 'imap.fastmail.com',
    imapPort: 993,
    smtpHost: 'smtp.fastmail.com',
    smtpPort: 465,
    smtpSecure: true,
  ),
  ProviderPreset(
    id: 'icloud',
    label: 'iCloud',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
    smtpSecure: false,
    hint: 'Username is the full iCloud address. App-specific password required.',
  ),
  ProviderPreset(
    id: 'generic',
    label: 'IMAP',
    imapHost: '',
    imapPort: 993,
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
  ),
];

class MailboxGateway {
  MailboxGateway({
    FlutterSecureStorage? storage,
    SharedPreferences? prefs,
  })  : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            ),
        _prefs = prefs;

  final FlutterSecureStorage _storage;
  SharedPreferences? _prefs;
  ImapClient? _imap;

  Future<SharedPreferences> _p() async => _prefs ??= await SharedPreferences.getInstance();

  Future<({ImapAccount account, String password})?> loadSaved() async {
    final prefs = await _p();
    final email = prefs.getString(_kEmail);
    if (email == null || email.isEmpty) return null;
    final password = await _storage.read(key: _kPass);
    if (password == null || password.isEmpty) return null;
    return (
      account: ImapAccount(
        email: email,
        name: prefs.getString(_kName) ?? email.split('@').first,
        provider: prefs.getString(_kProvider) ?? 'generic',
        imapHost: prefs.getString(_kImapHost) ?? '',
        imapPort: prefs.getInt(_kImapPort) ?? 993,
        smtpHost: prefs.getString(_kSmtpHost) ?? '',
        smtpPort: prefs.getInt(_kSmtpPort) ?? 465,
        smtpSecure: prefs.getBool(_kSmtpSecure) ?? true,
        username: prefs.getString(_kUser),
      ),
      password: password,
    );
  }

  Future<void> saveAccount(ImapAccount account, String password) async {
    final prefs = await _p();
    await prefs.setString(_kEmail, account.email);
    await prefs.setString(_kName, account.name);
    await prefs.setString(_kProvider, account.provider);
    await prefs.setString(_kImapHost, account.imapHost);
    await prefs.setInt(_kImapPort, account.imapPort);
    await prefs.setString(_kSmtpHost, account.smtpHost);
    await prefs.setInt(_kSmtpPort, account.smtpPort);
    await prefs.setBool(_kSmtpSecure, account.smtpSecure);
    if (account.username != null) {
      await prefs.setString(_kUser, account.username!);
    }
    await _storage.write(key: _kPass, value: password);
  }

  Future<void> clear() async {
    await disconnect();
    final prefs = await _p();
    for (final k in [
      _kEmail,
      _kName,
      _kProvider,
      _kImapHost,
      _kImapPort,
      _kSmtpHost,
      _kSmtpPort,
      _kSmtpSecure,
      _kUser,
    ]) {
      await prefs.remove(k);
    }
    await _storage.delete(key: _kPass);
  }

  Future<void> connect(ImapAccount account, String password) async {
    await disconnect();
    final client = ImapClient(isLogEnabled: false);
    await client.connectToServer(account.imapHost, account.imapPort, isSecure: true);
    await client.login(account.user, password);
    _imap = client;
  }

  Future<void> disconnect() async {
    final client = _imap;
    _imap = null;
    if (client == null) return;
    try {
      await client.logout();
    } catch (_) {}
    try {
      await client.disconnect();
    } catch (_) {}
  }

  Future<List<Thread>> fetchInbox({int count = 60}) async {
    final client = _imap;
    if (client == null) throw StateError('Not connected');
    await client.selectInbox();
    final fetch = await client.fetchRecentMessages(
      messageCount: count,
      criteria: 'BODY.PEEK[]',
    );
    return fetch.messages.map(_threadFromMime).toList().reversed.toList();
  }

  Future<void> markSeen(int uid, {required bool seen}) async {
    final client = _imap;
    if (client == null) return;
    final seq = MessageSequence.fromId(uid, isUid: true);
    if (seen) {
      await client.uidStore(seq, [r'\Seen']);
    } else {
      await client.uidStore(seq, [r'\Seen']);
    }
  }

  Future<void> move(int uid, String mailbox) async {
    final client = _imap;
    if (client == null) return;
    final seq = MessageSequence.fromId(uid, isUid: true);
    try {
      await client.uidMove(seq, targetMailboxPath: mailbox);
    } catch (_) {
      try {
        await client.uidCopy(seq, targetMailboxPath: mailbox);
        await client.uidStore(seq, [r'\Deleted']);
      } catch (_) {}
    }
  }

  Future<void> send({
    required ImapAccount account,
    required String password,
    required Person from,
    required String to,
    required String cc,
    required String subject,
    required String body,
  }) async {
    final smtp = SmtpClient('omadash', isLogEnabled: false);
    await smtp.connectToServer(
      account.smtpHost,
      account.smtpPort,
      isSecure: account.smtpSecure,
    );
    await smtp.ehlo();
    if (!account.smtpSecure) {
      try {
        await smtp.startTls();
      } catch (_) {}
    }
    if (smtp.serverInfo.supportsAuth(AuthMechanism.plain)) {
      await smtp.authenticate(account.user, password, AuthMechanism.plain);
    } else if (smtp.serverInfo.supportsAuth(AuthMechanism.login)) {
      await smtp.authenticate(account.user, password, AuthMechanism.login);
    } else {
      await smtp.authenticate(account.user, password);
    }

    final toList = _parseAddresses(to);
    final ccList = _parseAddresses(cc);
    if (toList.isEmpty) throw StateError('Need at least one recipient');

    final builder = MessageBuilder.prepareMultipartAlternativeMessage(
      plainText: body,
      htmlText: '<pre>${_escape(body)}</pre>',
    )
      ..from = [MailAddress(from.name, from.email)]
      ..to = toList
      ..cc = ccList
      ..subject = subject.isEmpty ? '(no subject)' : subject;

    final mime = builder.buildMimeMessage();
    final res = await smtp.sendMessage(mime);
    try {
      await smtp.quit();
    } catch (_) {}
    if (!res.isOkStatus) {
      throw StateError('SMTP ${res.code}: ${res.message}');
    }
  }

  Thread _threadFromMime(MimeMessage msg) {
    final fromList = msg.from;
    final from = _person(fromList == null || fromList.isEmpty ? null : fromList.first) ??
        const Person(name: 'Unknown', email: 'unknown@localhost');
    final to = (msg.to ?? []).map(_person).whereType<Person>().toList();
    final cc = (msg.cc ?? []).map(_person).whereType<Person>().toList();
    final subject = msg.decodeSubject() ?? '(no subject)';
    final body = msg.decodeTextPlainPart() ??
        _stripHtml(msg.decodeTextHtmlPart() ?? '') ??
        '';
    final uid = msg.uid;
    final id = uid != null ? 'imap-$uid' : 'imap-${msg.hashCode}';
    final date = msg.decodeDate() ?? DateTime.now();
    final unread = !(msg.isSeen);
    final starred = msg.isFlagged;
    final attachments = <Attachment>[];
    try {
      for (final info in msg.findContentInfo()) {
        if (info.isAttachment) {
          attachments.add(Attachment(
            name: info.fileName ?? 'attachment',
            size: '',
          ));
        }
      }
    } catch (_) {}
    final focused = !_looksOther(from, subject);
    return Thread(
      id: id,
      subject: subject,
      folder: Folder.inbox,
      unread: unread,
      starred: starred,
      focused: focused,
      messages: [
        MailMessage(
          id: '$id-0',
          from: from,
          to: to.isEmpty ? [demoMe] : to,
          cc: cc,
          date: date,
          body: body.trim(),
          html: msg.decodeTextHtmlPart(),
          attachments: attachments,
          imapMailbox: 'INBOX',
          imapUid: uid,
        ),
      ],
    );
  }

  Person? _person(MailAddress? a) {
    if (a == null) return null;
    final email = a.email;
    if (email.isEmpty) return null;
    final name = (a.personalName ?? '').trim();
    return Person(name: name.isEmpty ? email.split('@').first : name, email: email);
  }

  List<MailAddress> _parseAddresses(String raw) {
    return raw
        .split(RegExp(r'[,;]'))
        .map((s) => s.trim())
        .where((s) => s.contains('@'))
        .map((s) {
      final match = RegExp(r'^(.*)<([^>]+)>$').firstMatch(s);
      if (match != null) {
        return MailAddress(match.group(1)!.trim(), match.group(2)!.trim());
      }
      return MailAddress(null, s);
    }).toList();
  }

  String _escape(String s) {
    const amp = '&' 'amp;';
    const lt = '&' 'lt;';
    const gt = '&' 'gt;';
    return s.replaceAll('&', amp).replaceAll('<', lt).replaceAll('>', gt);
  }

  String? _stripHtml(String? html) {
    if (html == null || html.isEmpty) return html;
    const amp = '&' 'amp;';
    const lt = '&' 'lt;';
    const gt = '&' 'gt;';
    const nbsp = '&' 'nbsp;';
    return html
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll(nbsp, ' ')
        .replaceAll(amp, '&')
        .replaceAll(lt, '<')
        .replaceAll(gt, '>');
  }

  bool _looksOther(Person from, String subject) {
    final email = from.email.toLowerCase();
    final sub = subject.toLowerCase();
    const noise = [
      'noreply',
      'no-reply',
      'notifications@',
      'news@',
      'digest@',
      'updates@',
      'receipts@',
      'deploys@',
    ];
    if (noise.any(email.contains)) return true;
    if (sub.startsWith('[basecamp') || sub.contains('notifications')) return true;
    return false;
  }
}

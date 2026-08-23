enum Folder {
  inbox,
  starred,
  waiting,
  drafts,
  sent,
  snoozed,
  done,
  trash,
}

enum Split { focused, other }

enum MailSource { demo, imap }

class Person {
  const Person({required this.name, required this.email});

  final String name;
  final String email;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
  }

  Map<String, dynamic> toJson() => {'name': name, 'email': email};

  factory Person.fromJson(Map<String, dynamic> json) => Person(
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
      );
}

class Attachment {
  const Attachment({required this.name, required this.size, this.mime});

  final String name;
  final String size;
  final String? mime;

  Map<String, dynamic> toJson() => {'name': name, 'size': size, 'mime': mime};

  factory Attachment.fromJson(Map<String, dynamic> json) => Attachment(
        name: json['name'] as String? ?? 'file',
        size: json['size'] as String? ?? '',
        mime: json['mime'] as String?,
      );
}

class MailMessage {
  const MailMessage({
    required this.id,
    required this.from,
    required this.to,
    required this.date,
    required this.body,
    this.cc = const [],
    this.attachments = const [],
    this.html,
    this.imapMailbox,
    this.imapUid,
  });

  final String id;
  final Person from;
  final List<Person> to;
  final List<Person> cc;
  final DateTime date;
  final String body;
  final String? html;
  final List<Attachment> attachments;
  final String? imapMailbox;
  final int? imapUid;

  String get snippet {
    final t = body.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (t.length <= 120) return t;
    return '${t.substring(0, 117)}…';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'from': from.toJson(),
        'to': to.map((p) => p.toJson()).toList(),
        'cc': cc.map((p) => p.toJson()).toList(),
        'date': date.toIso8601String(),
        'body': body,
        'html': html,
        'attachments': attachments.map((a) => a.toJson()).toList(),
        'imapMailbox': imapMailbox,
        'imapUid': imapUid,
      };

  factory MailMessage.fromJson(Map<String, dynamic> json) => MailMessage(
        id: json['id'] as String,
        from: Person.fromJson(Map<String, dynamic>.from(json['from'] as Map)),
        to: (json['to'] as List? ?? [])
            .map((e) => Person.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        cc: (json['cc'] as List? ?? [])
            .map((e) => Person.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        date: DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
        body: json['body'] as String? ?? '',
        html: json['html'] as String?,
        attachments: (json['attachments'] as List? ?? [])
            .map((e) => Attachment.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        imapMailbox: json['imapMailbox'] as String?,
        imapUid: json['imapUid'] as int?,
      );
}

class Thread {
  Thread({
    required this.id,
    required this.subject,
    required this.folder,
    required this.messages,
    this.unread = false,
    this.starred = false,
    this.focused = true,
    this.labels = const [],
  });

  final String id;
  String subject;
  Folder folder;
  bool unread;
  bool starred;
  bool focused;
  List<String> labels;
  List<MailMessage> messages;

  MailMessage get latest => messages.last;
  Person get counterpart => latest.from;
  DateTime get latestDate => latest.date;

  Map<String, dynamic> toJson() => {
        'id': id,
        'subject': subject,
        'folder': folder.name,
        'unread': unread,
        'starred': starred,
        'focused': focused,
        'labels': labels,
        'messages': messages.map((m) => m.toJson()).toList(),
      };

  factory Thread.fromJson(Map<String, dynamic> json) => Thread(
        id: json['id'] as String,
        subject: json['subject'] as String? ?? '(no subject)',
        folder: Folder.values.firstWhere(
          (f) => f.name == json['folder'],
          orElse: () => Folder.inbox,
        ),
        unread: json['unread'] as bool? ?? false,
        starred: json['starred'] as bool? ?? false,
        focused: json['focused'] as bool? ?? true,
        labels: (json['labels'] as List? ?? []).cast<String>(),
        messages: (json['messages'] as List? ?? [])
            .map((e) => MailMessage.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );
}

class CalEvent {
  const CalEvent({
    required this.id,
    required this.title,
    required this.start,
    required this.end,
    this.where,
    this.who,
    this.threadId,
  });

  final String id;
  final String title;
  final DateTime start;
  final DateTime end;
  final String? where;
  final String? who;
  final String? threadId;
}

class ComposeDraft {
  ComposeDraft({
    this.to = '',
    this.cc = '',
    this.subject = '',
    this.body = '',
    this.threadId,
    this.replyAll = false,
  });

  String to;
  String cc;
  String subject;
  String body;
  String? threadId;
  bool replyAll;
}

class ImapAccount {
  const ImapAccount({
    required this.email,
    required this.name,
    required this.provider,
    required this.imapHost,
    required this.imapPort,
    required this.smtpHost,
    required this.smtpPort,
    required this.smtpSecure,
    this.username,
  });

  final String email;
  final String name;
  final String provider;
  final String imapHost;
  final int imapPort;
  final String smtpHost;
  final int smtpPort;
  final bool smtpSecure;
  final String? username;

  String get user => username ?? email;
}

class FolderMeta {
  const FolderMeta(this.id, this.label, this.hint);
  final Folder id;
  final String label;
  final String hint;
}

const folders = [
  FolderMeta(Folder.inbox, 'Inbox', 'G I'),
  FolderMeta(Folder.starred, 'Starred', 'G S'),
  FolderMeta(Folder.waiting, 'Waiting', 'G W'),
  FolderMeta(Folder.drafts, 'Drafts', 'G D'),
  FolderMeta(Folder.sent, 'Sent', 'G T'),
  FolderMeta(Folder.snoozed, 'Snoozed', 'G H'),
  FolderMeta(Folder.done, 'Done', 'G E'),
  FolderMeta(Folder.trash, 'Trash', 'G #'),
];

const demoMe = Person(name: 'Alex Rivera', email: 'alex@omarchy.dev');

const appName = 'Omadash';
const appVersion = '0.2.0';
const appTagline = 'Mail on the home row.';

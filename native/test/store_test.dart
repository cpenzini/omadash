import 'package:flutter_test/flutter_test.dart';
import 'package:omadash/src/models.dart';
import 'package:omadash/src/seed.dart';
import 'package:omadash/src/store.dart';

void main() {
  MailStore store() => MailStore(seed: buildSeed(DateTime.parse('2026-08-22T05:00:00.000Z')));

  test('seed inbox has focused unread mail', () {
    final s = store();
    s.selectedId = s.visible.first.id;
    expect(s.visible, isNotEmpty);
    expect(s.visible.first.unread, isTrue);
    expect(s.visible.every((t) => t.focused), isTrue);
    expect(s.unreadIn(Folder.inbox), greaterThan(0));
  });

  test('j/k walks the list', () {
    final s = store();
    s.select(s.visible.first.id);
    final first = s.selectedId;
    s.selectDelta(1);
    expect(s.selectedId, isNot(first));
    s.selectDelta(-1);
    expect(s.selectedId, first);
  });

  test('E archives and U undoes', () {
    final s = store();
    s.select(s.visible.first.id);
    final id = s.selectedId!;
    s.archive();
    expect(s.threads.firstWhere((t) => t.id == id).folder, Folder.done);
    expect(s.visible.any((t) => t.id == id), isFalse);
    s.undo();
    expect(s.threads.firstWhere((t) => t.id == id).folder, Folder.inbox);
  });

  test('star and trash', () {
    final s = store();
    final unstarred = s.visible.firstWhere((t) => !t.starred);
    s.select(unstarred.id);
    final id = s.selectedId!;
    s.star();
    expect(s.threads.firstWhere((t) => t.id == id).starred, isTrue);
    s.trash();
    expect(s.threads.firstWhere((t) => t.id == id).folder, Folder.trash);
  });

  test('other split hides focused', () {
    final s = store();
    s.setSplit(Split.other);
    expect(s.visible.every((t) => !t.focused), isTrue);
  });

  test('compose send lands in sent', () async {
    final s = store();
    s.openCompose();
    s.compose!.to = 'maya@studio.null';
    s.compose!.subject = 'Bar notes';
    s.compose!.body = 'Looks good.';
    await s.send();
    expect(s.compose, isNull);
    expect(s.threads.any((t) => t.folder == Folder.sent && t.subject == 'Bar notes'), isTrue);
  });

  test('calendar seed has standup', () {
    final events = buildCalendarSeed(DateTime(2026, 8, 22, 9));
    expect(events.map((e) => e.title), contains('Standup'));
  });
}

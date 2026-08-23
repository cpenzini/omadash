import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'models.dart';
import 'store.dart';

/// Superhuman-style keymap. Returns true if the event was consumed.
bool handleKey(KeyEvent event, MailStore store, {required bool typing}) {
  if (event is! KeyDownEvent && event is! KeyRepeatEvent) return false;

  final key = event.logicalKey;
  final meta = HardwareKeyboard.instance.isControlPressed ||
      HardwareKeyboard.instance.isMetaPressed;
  final shift = HardwareKeyboard.instance.isShiftPressed;
  final label = event.character ?? key.keyLabel;
  final lower = label.toLowerCase();

  if (key == LogicalKeyboardKey.escape) {
    if (store.compose != null) {
      store.closeCompose();
      return true;
    }
    if (store.shortcutsOpen) {
      store.setShortcutsOpen(false);
      return true;
    }
    if (store.connectOpen) {
      store.setConnectOpen(false);
      return true;
    }
    if (store.calendarOpen) {
      store.setCalendarOpen(false);
      return true;
    }
    if (store.onboarding) {
      store.dismissOnboarding();
      return true;
    }
    return true;
  }

  if (meta && lower == 'k') {
    return false; // shell opens the command panel
  }

  if (store.compose != null && meta && key == LogicalKeyboardKey.enter) {
    store.send();
    return true;
  }

  if (typing) return false;

  if (store.goArmed) {
    store.clearGo();
    switch (lower) {
      case 'i':
        store.setFolder(Folder.inbox);
        return true;
      case 's':
        store.setFolder(Folder.starred);
        return true;
      case 'w':
        store.setFolder(Folder.waiting);
        return true;
      case 'd':
        store.setFolder(Folder.drafts);
        return true;
      case 't':
        store.setFolder(Folder.sent);
        return true;
      case 'h':
        store.setFolder(Folder.snoozed);
        return true;
      case 'e':
        store.setFolder(Folder.done);
        return true;
      case '#':
        store.setFolder(Folder.trash);
        return true;
      case 'c':
        store.setCalendarOpen(true);
        return true;
      case 'p':
        store.setConnectOpen(true);
        return true;
      case 'a':
        store.setShortcutsOpen(true);
        return true;
    }
    if (label == '#') {
      store.setFolder(Folder.trash);
      return true;
    }
    return true;
  }

  if (lower == 'g') {
    store.armGo();
    return true;
  }

  if (lower == 'j' || key == LogicalKeyboardKey.arrowDown) {
    store.selectDelta(1);
    return true;
  }
  if (lower == 'k' || key == LogicalKeyboardKey.arrowUp) {
    store.selectDelta(-1);
    return true;
  }
  if (key == LogicalKeyboardKey.enter || lower == 'o') {
    final t = store.selected;
    if (t != null) store.select(t.id);
    return true;
  }
  if (lower == 'e') {
    store.archive();
    return true;
  }
  if (label == '#' || (shift && label == '3')) {
    store.trash();
    return true;
  }
  if (lower == 'c' && !shift) {
    store.openCompose();
    return true;
  }
  if (lower == 'r') {
    store.openCompose(reply: store.selected, replyAll: shift);
    return true;
  }
  if (lower == 'f' && shift == false && store.selected != null) {
    store.openCompose(reply: store.selected, forward: true);
    return true;
  }
  if (lower == 's') {
    store.star();
    return true;
  }
  if (lower == 'u') {
    store.undo();
    return true;
  }
  if (lower == 'z') {
    store.toggleUnread();
    return true;
  }
  if (lower == '3') {
    store.setCalendarOpen(!store.calendarOpen);
    return true;
  }
  if (lower == '?' || (shift && label == '/')) {
    store.setShortcutsOpen(!store.shortcutsOpen);
    return true;
  }
  if (label == '/' && !shift) {
    return false; // command panel
  }
  if (lower == 'tab' || key == LogicalKeyboardKey.tab) {
    store.setSplit(store.split == Split.focused ? Split.other : Split.focused);
    return true;
  }
  if (lower == 'p' && store.calendarOpen) {
    store.setConnectOpen(true);
    return true;
  }
  return false;
}

bool isTyping(BuildContext context) {
  final primary = FocusManager.instance.primaryFocus;
  if (primary == null) return false;
  final ctx = primary.context;
  if (ctx == null) return false;
  return ctx.findAncestorWidgetOfExactType<EditableText>() != null ||
      ctx.widget is EditableText;
}

/**
 * The keymap. If it is not handled here, Omadash does not hear it.
 * Document every new binding in shortcut-sheet.tsx.
 */
import { useThemeStore } from "@/lib/theme";
import { applyMailLayout, usePrefsStore } from "./prefs";
import { useCalendarStore } from "./calendar";
import type { MailState } from "./store";

function isQuestionKey(e: KeyboardEvent) {
  return e.key === "?" || (e.shiftKey && e.key === "/");
}

function typingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function isCycleKey(e: KeyboardEvent) {
  return e.key === "`" || e.key === "~" || e.code === "Backquote";
}

function cycleDir(e: KeyboardEvent): 1 | -1 {
  return e.shiftKey || e.key === "~" ? -1 : 1;
}

export function handleHotkey(
  e: KeyboardEvent,
  store: MailState,
  toast: (msg: string) => void,
): boolean {
  const meta = e.metaKey || e.ctrlKey;
  const key = e.key;
  const lower = key.length === 1 ? key.toLowerCase() : key;
  const inField = typingInField(e.target);
  const calConnect = useCalendarStore.getState().connectOpen;

  if (key === "Escape") {
    if (store.compose) {
      store.closeCompose(true);
      toast("Saved to drafts");
      return true;
    }
    if (store.commandOpen) {
      store.setCommandOpen(false);
      return true;
    }
    if (store.shortcutsOpen) {
      store.setShortcutsOpen(false);
      return true;
    }
    if (store.snoozeOpen) {
      store.setSnoozeOpen(false);
      return true;
    }
    if (calConnect) {
      useCalendarStore.getState().setConnectOpen(false);
      return true;
    }
    if (store.calendarOpen) {
      store.setCalendarOpen(false);
      return true;
    }
    if (store.labelOpen) {
      store.setLabelOpen(false);
      return true;
    }
    if (store.rulesOpen) {
      store.setRulesOpen(false);
      return true;
    }
    if (store.sendLaterOpen) {
      store.setSendLaterOpen(false);
      return true;
    }
    if (store.fileEventOpen) {
      store.setFileEventOpen(false);
      return true;
    }
    if (store.connectOpen) {
      store.setConnectOpen(false);
      return true;
    }
    if (useThemeStore.getState().open) {
      useThemeStore.getState().setOpen(false);
      return true;
    }
    if (usePrefsStore.getState().settingsOpen) {
      usePrefsStore.getState().setSettingsOpen(false);
      return true;
    }
    if (store.omarchyOpen) {
      store.setOmarchyOpen(false);
      return true;
    }
    if (store.checkedIds.length) {
      store.clearChecks();
      return true;
    }
    if (store.onboarding) {
      store.dismissOnboarding();
      return true;
    }
    if (store.mobilePane === "read") {
      store.setMobilePane("list");
      return true;
    }
    return false;
  }

  if (meta && lower === "k") {
    e.preventDefault();
    store.setCommandOpen(!store.commandOpen);
    return true;
  }

  if (store.compose && meta && key === "Enter") {
    e.preventDefault();
    void store.send().then((err) => {
      if (err) toast(err);
      else toast("Sending · U to undo");
    });
    return true;
  }

  if (inField || store.commandOpen || store.compose || store.connectOpen) return false;
  if (calConnect) return true;
  const prefs = usePrefsStore.getState();
  if (prefs.settingsOpen) {
    if (key === ",") {
      prefs.setSettingsOpen(false);
      return true;
    }
    return true;
  }
  if (useThemeStore.getState().open || store.omarchyOpen) return true;
  if (store.calendarOpen) {
    if (store.pendingG) {
      store.setPendingG(false);
      if (lower === "i") {
        store.setCalendarOpen(false);
        store.setFolder("inbox");
      } else if (lower === "s") {
        store.setCalendarOpen(false);
        store.setFolder("starred");
      } else if (lower === "w") {
        store.setCalendarOpen(false);
        store.setFolder("waiting");
      } else if (lower === "d") {
        store.setCalendarOpen(false);
        store.setFolder("drafts");
      } else if (lower === "t") {
        store.setCalendarOpen(false);
        store.setFolder("sent");
      } else if (lower === "h") {
        store.setCalendarOpen(false);
        store.setFolder("snoozed");
      } else if (lower === "e") {
        store.setCalendarOpen(false);
        store.setFolder("done");
      } else if (key === "#") {
        store.setCalendarOpen(false);
        store.setFolder("trash");
      } else if (lower === "a") usePrefsStore.getState().setSettingsOpen(true);
      else if (lower === "c") {
        /* already here */
      } else if (lower === "1") store.switchBox(1);
      else if (lower === "2") store.switchBox(2);
      else if (lower === "3") store.setCalendarOpen(true);
      else if (isCycleKey(e)) store.cycleSpace(cycleDir(e));
      return true;
    }
    if (lower === "g") {
      store.setPendingG(true);
      window.setTimeout(() => store.setPendingG(false), 1200);
      return true;
    }
    if (lower === "1") {
      store.switchBox(1);
      return true;
    }
    if (lower === "2") {
      store.switchBox(2);
      return true;
    }
    if (lower === "3") {
      store.setCalendarOpen(true);
      return true;
    }
    if (isCycleKey(e)) {
      store.cycleSpace(cycleDir(e));
      return true;
    }
    if (isQuestionKey(e)) {
      store.setShortcutsOpen(!store.shortcutsOpen);
      return true;
    }
    if (key === ",") {
      usePrefsStore.getState().setSettingsOpen(true);
      return true;
    }
    if (key === "\\") {
      const next = usePrefsStore.getState().layout === "two" ? "three" : "two";
      applyMailLayout(next, store);
      toast(next === "two" ? "Two panes" : "Three panes");
      return true;
    }
    if (key === "/") {
      store.setCommandOpen(true);
      return true;
    }
    return true;
  }
  if (store.labelOpen || store.sendLaterOpen || store.rulesOpen || store.fileEventOpen) return true;
  if (store.shortcutsOpen) {
    if (isQuestionKey(e)) {
      store.setShortcutsOpen(false);
      return true;
    }
    return true;
  }

  if (store.pendingG) {
    store.setPendingG(false);
    if (lower === "i") store.setFolder("inbox");
    else if (lower === "s") store.setFolder("starred");
    else if (lower === "w") store.setFolder("waiting");
    else if (lower === "d") store.setFolder("drafts");
    else if (lower === "t") store.setFolder("sent");
    else if (lower === "h") store.setFolder("snoozed");
    else if (lower === "e") store.setFolder("done");
    else if (key === "#") store.setFolder("trash");
    else if (lower === "a") usePrefsStore.getState().setSettingsOpen(true);
    else if (lower === "c") store.setCalendarOpen(true);
    else if (lower === "1") store.switchBox(1);
    else if (lower === "2") store.switchBox(2);
    else if (lower === "3") store.setCalendarOpen(true);
    else if (isCycleKey(e)) store.cycleSpace(cycleDir(e));
    else if (lower === "g") store.move(-999);
    return true;
  }

  if (lower === "g") {
    store.setPendingG(true);
    window.setTimeout(() => store.setPendingG(false), 1200);
    return true;
  }

  if (lower === "1") {
    store.switchBox(1);
    return true;
  }
  if (lower === "2") {
    store.switchBox(2);
    return true;
  }
  if (lower === "3") {
    store.setCalendarOpen(true);
    return true;
  }
  if (isCycleKey(e)) {
    store.cycleSpace(cycleDir(e));
    return true;
  }

  if (lower === "j" || key === "ArrowDown") {
    store.move(1);
    return true;
  }
  if (lower === "k" || key === "ArrowUp") {
    store.move(-1);
    return true;
  }
  if (e.shiftKey && (lower === "o" || lower === "i")) {
    store.trainSplit(lower === "i" ? "focused" : "other");
    return true;
  }
  if (key === "Enter" || (lower === "o" && !e.shiftKey)) {
    if (store.selectedId) store.select(store.selectedId, { open: true });
    return true;
  }
  if (lower === "e") {
    store.done();
    toast("Done · U to undo");
    return true;
  }
  if (key === "#") {
    store.trash();
    toast("Trashed · U to undo");
    return true;
  }
  if (lower === "s") {
    store.toggleStar();
    return true;
  }
  if (lower === "x") {
    store.toggleCheck();
    return true;
  }
  if (lower === "m") {
    store.mute();
    toast("Muted · U to undo");
    return true;
  }
  if (lower === "l") {
    store.setLabelOpen(true);
    return true;
  }
  if (lower === "y") {
    void store.summarize();
    return true;
  }
  if (lower === "r") {
    store.reply(e.shiftKey);
    return true;
  }
  if (lower === "f") {
    store.forward();
    return true;
  }
  if (lower === "c") {
    store.openCompose();
    return true;
  }
  if (lower === "u") {
    const label = store.undo();
    if (label) toast(`Undid ${label.toLowerCase()}`);
    return true;
  }
  if (lower === "z") {
    store.toggleUnread();
    toast("Toggled unread");
    return true;
  }
  if (lower === "h") {
    store.setSnoozeOpen(true);
    return true;
  }
  if (lower === "n") {
    if (!store.selectedId) {
      toast("Select a thread");
      return true;
    }
    store.select(store.selectedId, { open: true });
    store.setFileEventOpen(true);
    return true;
  }
  if (isQuestionKey(e)) {
    store.setShortcutsOpen(!store.shortcutsOpen);
    return true;
  }
  if (key === ",") {
    e.preventDefault();
    usePrefsStore.getState().setSettingsOpen(true);
    return true;
  }
  if (key === "\\") {
    e.preventDefault();
    const next = usePrefsStore.getState().layout === "two" ? "three" : "two";
    applyMailLayout(next, store);
    toast(next === "two" ? "Two panes" : "Three panes");
    return true;
  }
  if (key === "/") {
    e.preventDefault();
    store.setCommandOpen(true);
    return true;
  }
  return false;
}

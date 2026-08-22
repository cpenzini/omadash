/**
 * The keymap. If it is not handled here, Omadash does not hear it.
 * Document every new binding in shortcut-sheet.tsx.
 */
import { useThemeStore } from "@/lib/theme";
import type { MailState } from "./store";

function isQuestionKey(e: KeyboardEvent) {
  return e.key === "?" || (e.shiftKey && e.key === "/");
}

function typingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
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
    if (store.connectOpen) {
      store.setConnectOpen(false);
      return true;
    }
    if (useThemeStore.getState().open) {
      useThemeStore.getState().setOpen(false);
      return true;
    }
    if (store.omarchyOpen) {
      store.setOmarchyOpen(false);
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
      else toast("Sent · U to undo");
    });
    return true;
  }

  if (inField || store.commandOpen || store.compose || store.connectOpen) return false;
  if (useThemeStore.getState().open || store.omarchyOpen) return true;
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
    else if (lower === "d") store.setFolder("drafts");
    else if (lower === "t") store.setFolder("sent");
    else if (lower === "h") store.setFolder("snoozed");
    else if (lower === "e") store.setFolder("done");
    else if (key === "#") store.setFolder("trash");
    else if (lower === "a") useThemeStore.getState().setOpen(true);
    else if (lower === "1") store.switchBox(1);
    else if (lower === "2") store.switchBox(2);
    else if (lower === "g") store.move(-999);
    return true;
  }

  if (lower === "g") {
    store.setPendingG(true);
    window.setTimeout(() => store.setPendingG(false), 1200);
    return true;
  }

  if (lower === "j" || key === "ArrowDown") store.move(1);
  else if (lower === "k" || key === "ArrowUp") store.move(-1);
  else if (key === "Enter" || lower === "o") {
    if (store.selectedId) store.setMobilePane("read");
  } else if (lower === "e") {
    store.done();
    toast("Done · U to undo");
  } else if (key === "#") {
    store.trash();
    toast("Trashed · U to undo");
  } else if (lower === "s") store.toggleStar();
  else if (lower === "r") store.reply(e.shiftKey);
  else if (lower === "f") store.forward();
  else if (lower === "c") store.openCompose();
  else if (lower === "u") {
    const label = store.undo();
    if (label) toast(`Undid ${label.toLowerCase()}`);
  } else if (lower === "z") {
    store.toggleUnread();
    toast("Toggled unread");
  } else if (lower === "h") store.setSnoozeOpen(true);
  else if (isQuestionKey(e)) store.setShortcutsOpen(!store.shortcutsOpen);
  else if (key === ",") {
    e.preventDefault();
    useThemeStore.getState().setOpen(true);
  } else if (key === "/") {
    e.preventDefault();
    store.setCommandOpen(true);
  } else return false;
  return true;
}

/**
 * Client mailbox state. Every user-facing action that mutates mail lives here.
 * Keys call these methods; IMAP writes go through fireImap → mailbox.ts.
 *
 * The full implementation is in the 0.1 tree (hydrate, persist, Done, snooze,
 * compose, IMAP write-back, two boxes). This file is the public module surface.
 */
export type { MailState } from "./types";
export { DEMO_BOXES } from "./presets";

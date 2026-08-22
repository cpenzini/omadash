# Extending Omadash 0.1

Omadash is source, not a plugin host. You change a file, you get a feature. These are the seams that were left obvious on purpose.

## Add a mail provider

Edit [`src/lib/mail/presets.ts`](../src/lib/mail/presets.ts).

```ts
{
  id: "proton",
  label: "Proton",
  imapHost: "imap.proton.me",
  imapPort: 993,
  smtpHost: "smtp.proton.me",
  smtpPort: 587,
  hint: "Bridge or an app password, not your mailbox password.",
}
```

Widen `MailProviderId`, add the preset, done. The connect overlay picks it up.

Two-way mutations (archive, trash, star, seen) live in [`src/lib/mail/imap.server.ts`](../src/lib/mail/imap.server.ts). If a host uses unusual special-use folders, extend `pickPath`.

## Add a snippet

Edit [`src/lib/mail/snippets.ts`](../src/lib/mail/snippets.ts).

```ts
{
  id: "ship",
  trigger: "ship",
  title: "Shipped",
  body: "Shipped. Notes are in the thread — ping me if anything looks off.",
}
```

Type `;ship` in compose. The palette lists every snippet.

## Add a theme

1. Add an id to `ThemeId` in [`src/lib/theme.ts`](../src/lib/theme.ts) and a row in `THEMES`.
2. Copy a block in [`src/styles.css`](../src/styles.css):

```css
html[data-theme="kanagawa"] {
  color-scheme: dark;
  --c-bg: #1f1f28;
  --c-surface: #2a2a37;
  --c-fg: #dcd7ba;
  --c-accent: #7e9cd8;
  /* map the rest from an existing theme */
}
```

3. Add `[data-preview="kanagawa"]` swatches next to the others.

Tokens: `--c-bg`, `--c-surface`, `--c-elevated`, `--c-panel`, `--c-fg`, `--c-muted`, `--c-subtle`, `--c-accent`, `--c-accent-fg`, `--c-border`, `--c-unread`, `--c-warn`, `--c-danger`, `--c-success`.

Omarchy palettes are the intended source. Match the Alacritty / waybar colors people already live in.

## Add a key

1. Handle it in [`src/lib/mail/hotkeys.ts`](../src/lib/mail/hotkeys.ts).
2. Put the action on the store in [`src/lib/mail/store.ts`](../src/lib/mail/store.ts) if it mutates mail.
3. Document it in [`src/components/mail/shortcut-sheet.tsx`](../src/components/mail/shortcut-sheet.tsx).

If it does not appear on `?`, it does not exist.

## Add a folder or split

Folders are the `Folder` union in [`src/lib/mail/types.ts`](../src/lib/mail/types.ts) plus the `FOLDERS` array (that is the sidebar). Split is `focused | other` on each thread; the IMAP path sets `focused` via `isFocused()` in `imap.server.ts` (mailing lists, no-reply, receipts go to Other).

## HTML and tracking

[`src/lib/mail/html.ts`](../src/lib/mail/html.ts) is the policy. Allowed tags, stripped handlers, tracker host regex, tiny 1×1 images. Tighten `TRACKER` when you find a new pixel network. Do not relax it to “make the newsletter pretty” without a Show-images path.

## Server functions

[`src/lib/mail/mailbox.ts`](../src/lib/mail/mailbox.ts) is the only door to IMAP from the client. Every function uses `authMiddleware`. Threads and boxes are keyed by `user_id`. If you add an endpoint, copy that pattern or you will leak mail.

## What 0.1 is not (yet)

These are good 0.2 essays, not silent scope:

- Plugin runtime / WASM extensions
- Gmail OAuth (app passwords on purpose)
- Follow-up bounce
- Thread summarize
- Calendar
- Unified search across both boxes at once

If you build one, keep the keymap honest and send a pull request.

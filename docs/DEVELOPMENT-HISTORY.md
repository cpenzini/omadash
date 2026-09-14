# Omadash — Current build: preview 06

- **Remembered accounts:** refresh credentials stored in the Linux Secret Service keyring; account restoration on launch. No plaintext token fallback.
- **Gmail triage:** archive, trash, star, mark read/unread, and account-specific undo. Actions are confirmed by Gmail, and failures are reported. U in the reader marks the conversation unread and returns to the list.
- **Compose and reply:** real send, selected-message reply/reply-all, forwarding text, To/Cc/Bcc, and outgoing attachments up to 18 MB total. Drafts autosave privately on disk and sync to Gmail after typing pauses or the composer closes. The sending account is fixed to the account where the draft was created.
- **Mail cache and synchronization:** private SQLite cache with full-text indexing; cached views appear immediately, Gmail loads up to four conversations concurrently, and each account independently indexes its history then checks for changes every minute. Server search covers all Gmail history while indexing runs.

Restart using `Open Omadash Native.sh`. Connect each account and use **Accounts → Enable Gmail actions** once. The Linux keyring may ask to be unlocked. See GOOGLE-SETUP.md for details.

Sending is a real action in this build. Ctrl+Enter or Send dispatches the current draft. Requests whose outcome is uncertain are never automatically resent, including after a restart; the draft is preserved for checking against Gmail. Undo applies to mailbox changes, not sent mail, and lasts for the current app session.

Validation uses fixtures for account isolation, disk persistence, MIME/header safety, attachments, exact mixed-message read-state undo, sync checkpoint failure handling, selected-message composition, and unconfirmed sends. Actual account consent and live sending still require user validation. Existing incoming attachment, HTML reading, keyboard, responsive layout, and theme tests remain in the suite.

## Earlier development notes (historical)

# Omadash — Native preview 04

A C++20 / Qt6 Widgets application for reviewing Omadash's core interactions on Linux. The interface uses native Qt controls and a custom painted conversation list. Sample mode uses fictional mail and simulated sending. A new read-only Google connection is implemented for one account and its primary calendar; live verification is pending Google project setup. See [Google setup](GOOGLE-SETUP.md).

Open **Open Omadash Native.sh** to launch the compiled app on this machine.

## Try it

- Use arrows or J/K in the inbox; Enter opens the selected conversation.
- Use arrows or N/P inside a conversation; Enter replies to the selected message. R replies to its sender; F forwards that message.
- Show details expands full available headers inline. O expands/collapses a message.
- C opens a full workspace compose screen. Drafts autosave locally. Escape saves and returns.
- / opens search in the main workspace. Search from a compose screen, then Escape to return to the draft.
- 0 toggles the docked sample calendar without opening another window.
- Tab / Shift+Tab switch splits. E archives; Z undoes a mail action. U toggles read, S toggles star, # moves to trash.
- Ctrl+K opens an integrated command panel. G then I/A/E/O/D opens inbox/all mail/archive/Other/drafts. Alt+1/2 switches sample accounts.
- Ctrl+Shift+O/C/B/F/S/M focuses To/Cc/Bcc/From/Subject/body in a draft. Ctrl+Enter simulates sending.

Split rules are evaluated in order, first match only. Existing split names and rules can be edited. The Other split is the final fallback. Search supports quoted text, negative terms, from:, to:, subject:, label:, account:, is:read/unread/starred, before:, and after:. It searches only the embedded sample history, including a 2021 archived conversation.

## Status and limits

Implemented: native inbox, conversation selection, selected-message replies, inline headers, main workspace compose/search, docked day calendar, sample accounts, local draft and mail-state persistence, basic triage with undo, editable existing split rules, light/dark appearance.

Pending: live validation of the new Google connection, multiple live accounts, durable secure credential storage, incremental synchronization, additional calendars and real calendar actions, attachment downloads, complete shortcut parity, split creation/reordering, label editing, signatures, send/undo-send, full-history indexing, packaging, and real-mailbox performance validation. The PRD remains the release specification; this preview is a subset, not release v0.1 completion.

Sample state is stored in `.state/workspace.json` beside this README. It contains only local sample mail and drafts you type. Sample mode makes no network requests. Connecting Google contacts only Google OAuth and API endpoints; live mail and tokens are kept in memory.

## Development verification

Build: `cmake -S . -B build -DCMAKE_BUILD_TYPE=Release` then `cmake --build build -j 4`.

Test: `GSETTINGS_BACKEND=memory ctest --test-dir build --output-on-failure`.

Qt tests exercise sample history search, reply source selection, keyboard opening/reply, draft preservation through search, and calendar ownership by the main window. Offscreen rendering provides a repeatable visual check. These checks do not establish performance with a real Gmail mailbox.

## Connected preview 02

Open Accounts to register/import the Google Desktop app client and connect. Gmail supports server-side queries and paginated conversation retrieval; the primary calendar is docked in the same window. Mailbox changes and composition are disabled in connected mode. The connected workflow has not yet been tested with a real account. Full setup, data handling, and verification limits are in [GOOGLE-SETUP.md](GOOGLE-SETUP.md).

## Formatted reading — preview 03

HTML messages now render within the native thread view using Qt WebEngine. Tables, inline CSS, colors, typography, and links are preserved. Each message has a plain-text toggle. External images load only when requested; embedded PNG/JPEG/GIF/WebP images and separately stored message bodies load from Gmail when expanded (5 MiB per resource, 20 MiB total, maximum 40 resources).

Scripts, forms, frames, plugins, local-file access, automatic downloads, and persistent browser storage are disabled. HTTP(S) and mailto links open externally. Remote stylesheets/fonts, SVG attachments, and HTML beyond WebEngine's setHtml size limit are not supported; use Plain text if rendering fails. External-image permission resets when the view is rebuilt.

Automated MIME, HTML rendering, and script-blocking tests pass. A designed sample was visually inspected. The product owner confirmed live Gmail and Calendar in preview 02; formatted live mail remains to be reviewed in preview 03. Multiple accounts and secure sign-in persistence remain next milestones.

References: [Qt WebEngine settings](https://doc.qt.io/qt-6/qwebenginesettings.html), [WebEngine profiles](https://doc.qt.io/qt-6/qwebengineprofile.html).

## Multiple accounts and attachments — preview 04

Connect the first Google account through Accounts, then use Add Google account for each additional identity. Alt+1 through Alt+9 switch between the first nine connected accounts; all connected accounts are available in the menu. Each account retains its own inbox/search results, pagination position, split, and selected row in memory. Its primary calendar follows the active account. Reconnecting the same identity replaces its connection rather than creating a duplicate. Disconnect removes just the active account, returning to sample mode only after the last account is removed. This milestone uses separate account views, not a unified inbox. Sign-ins still last only until app exit.

Incoming attachments appear under each message with View and Save controls. PDF, raster images, and text/JSON can be previewed within the main workspace; Escape returns to the selected message. Other file types can be saved without being executed. Downloads use the message's owning account, and stale results are ignored after switching accounts. Save uses a chosen destination, a sanitized suggested name, atomic replacement, and owner-only permissions. The file picker confirms overwrites. Download limit: 50 MB. Text previews show at most 2 MB; image previews show a scaled static image. Outgoing attachment composition remains part of the later sending milestone.

U in the reader always marks the conversation unread and returns to the list after Gmail confirms success. In the list, U toggles the current conversation's read state. Existing read-only connections first offer an explicit Google permission upgrade. Google requires the broader gmail.modify scope for this operation; the app currently uses it only for read/unread status. Archive, trash, draft creation, and sending remain disabled for live mail. No modification is made merely by connecting or upgrading permission. After upgrading, press U on the intended conversation again.

Tests cover account identity/cache isolation even with identical Gmail thread IDs, duplicate reconnects, disconnect restoration, attachment metadata and safe filenames, binary saving, in-workspace text/PDF previews, PDF cleanup, unread reader behavior, and refusal to modify without permission. These automated checks use fixtures; live multi-account, attachment, and unread verification is still pending user review.

References: [Gmail attachment API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get), [Qt PDF document](https://doc.qt.io/qt-6/qpdfdocument.html).

### Preview 04.1 — Google sign-in recovery
Fixed the development launch permissions that prevented Chrome from opening its profile. Sign-in now displays Open sign-in, Copy sign-in link, and Cancel controls in the main window while authorization is pending. The callback remains active for three minutes if the desktop browser launcher fails, so the copied link still works. Cancellation invalidates the pending callback; retry generates a fresh state and PKCE verifier. Authorization links and tokens stay in memory.

Validation: native workflow suite passes, including sign-in URL dispatch, scope selection, visible recovery controls, copying, cancellation, and retry. The desktop launcher was also checked with a Google account page and reported opening in the existing browser session. Completing account consent remains a user action.

### Preview 05 — Inbox visual refinement
Blue unread dots replace unread-dependent text weight. Senders retain a consistent semibold weight; subjects are regular, snippets and times muted. The inbox uses 15 px Adwaita Sans (Liberation Sans fallback), 46 px conversation rows, date headings, attachment paperclips, quiet split navigation, and connected-account tabs. Selection uses a soft tint and a slim accent bar.

Omadash reads `~/.config/omarchy/current/theme/colors.toml`, falling back to the theme's `alacritty.toml`. It checks for color changes every two seconds without altering desktop configuration. This build environment has no active Omarchy theme files, so the captured preview uses the neutral fallback. Native workflow and theme parser tests pass. Exact reference font identity is unconfirmed; the installed font is a visual approximation.

### Preview 05.1 — Responsive spacing
Inbox rows share aligned sender, subject, and snippet columns (23%, 40%, and the remaining text width), with reserved unread and metadata gutters. The list fills the available workspace and expands or contracts with the window. Reader side padding is reduced, recipient lines and header fields wrap, and HTML layout containers/tables use the available width. Images retain their aspect ratio. This intentionally overrides sender-specified fixed layout widths to support fluid reading.

Validation: native workflow suite passes, including resizing a reader containing a 1200 px HTML table from a 900 px window to 1600 px and back, checking that content fits without horizontal scrolling, and checking inbox expansion.

### Preview 05.2 — Per-account external images and text extraction
Accounts now shows an Automatically load external images checkbox below each connected account. It defaults off, applies immediately to the current reader, and is remembered in `.state/image-preferences.ini` across restarts. The per-message image-loading button has been removed. Inline MIME images remain available independently. The checkbox tooltip explains that external images contact sender servers.

HTML-to-plain-text extraction now removes sender styling and presentation attributes before Qt parses it; original formatted HTML remains unchanged. This avoids passing invalid color and zero-font-size declarations into Qt's rich-text conversion path. Regression fixtures verify malformed styles do not cause parser warnings or lose message text, account image preferences remain separate, and toggling updates the reader. All native workflow tests pass.

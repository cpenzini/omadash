# Omadash

Keyboard-first Gmail and Google Calendar for Omarchy, built as a native C++20 / Qt6 desktop application.

Designed for high-performing professionals, founders, executives, and technical people who want to move through their inbox and daily workflows quickly.

**Status: v0.1 development preview 06.** This is a working native preview; the full PRD is not yet complete. Product acceptance remains with the product owner.

## Features

- Compact conversation rows, ordered split inboxes, blue unread indicators, keyboard selection, and responsive layouts.
- Multiple Google accounts with separate inbox, search, and calendar views; Linux keyring account restoration.
- Main-workspace search across Gmail history, compose, replies to a selected message, and inline message headers.
- HTML email reading, per-account external-image settings, incoming attachments, and in-window PDF/image/text previews.
- Archive, trash, star, mark read/unread, and session undo for mailbox changes.
- Real sending, To/Cc/Bcc, reply/reply-all, text forwarding, and outgoing attachments up to 18 MB total.
- Local draft recovery and Gmail draft synchronization. Uncertain sends are preserved for review and are never automatically resent.
- Private SQLite mail cache, full-text index, background history indexing, and incremental synchronization.
- A docked, read-only primary Google Calendar and colors from the active Omarchy theme.

## Build and launch

Requires Linux, a C++20 compiler, CMake 3.21+, Qt 6.6+ with Widgets, Network, SQL/SQLite, Test, WebEngineWidgets and PdfWidgets, plus `secret-tool` and a working Secret Service keyring to remember accounts. Tested with Qt 6.11.2 on this development machine.

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j 4
bash "Open Omadash Native.sh"
```

Launch from this source checkout. The current preview stores state in `.state/` beside the source tree, relative to the build executable; system-wide installation and distribution packages are not ready yet. Start in fictional sample mode or follow [Google setup](GOOGLE-SETUP.md) to connect your accounts.

## Keyboard essentials

| Action | Shortcut |
| --- | --- |
| Select conversation | Up/Down or J/K |
| Open selected conversation | Enter |
| Select message within a thread | Up/Down or N/P |
| Reply-all to selected message | Enter |
| Reply / forward selected message | R / F |
| Compose / search | C / / |
| Switch splits | Tab / Shift+Tab |
| Switch accounts | Alt+1 through Alt+9 |
| Archive / star / trash | E / S / # |
| Mark unread and return from reader | U |
| Undo mailbox change | Z |
| Send draft | Ctrl+Enter |
| Save draft and return | Escape |

The [PRD shortcut reference](docs/PRD-v0.1.md) contains the full target mapping. Not every target shortcut is implemented. Source Command maps to Ctrl; source Control maps to Alt.

## Data and account setup

Refresh credentials use the Linux Secret Service keyring with no plaintext fallback. Cached mail, search indexes, and unsent drafts are owner-only local files, but are not encrypted by the app. External images are off by default and configurable per account. Never commit `.state/`, downloaded OAuth client JSON, mailbox contents, or credentials.

See [Google setup and data handling](GOOGLE-SETUP.md). Sending and mailbox actions affect the connected Gmail account. Undo does not recall sent mail. Calendar is read-only.

## Verification

```sh
GSETTINGS_BACKEND=memory QTWEBENGINE_CHROMIUM_FLAGS=--disable-gpu \
  ctest --test-dir build --output-on-failure
```

Tests run offscreen with fictional fixtures. They cover keyboard workflows, account isolation, selected-message replies, HTML policy, attachment handling, cache persistence, MIME safety, exact read-state undo, sync checkpoints, and uncertain-send protection. They do not send real mail or validate live Google consent. Real mailbox performance and end-to-end sending remain owner acceptance checks.

## Scope and documentation

The [PRD v0.1](docs/PRD-v0.1.md) defines the release target and owner acceptance criteria. [Development history](docs/DEVELOPMENT-HISTORY.md) records earlier milestones; its historical limitations are superseded by the current README.

Still pending: full shortcut parity, richer split management, label editing, signatures, calendar write actions, distribution packaging, and large-mailbox performance validation. Snooze, reminders, and team collaboration are deferred.

This native product starts a fresh source history; the previous web implementation is preserved separately in the archived repository.

## License

MIT for Omadash source code. Third-party reference material in `docs/references/` remains the property of its respective owner and is not relicensed under MIT.

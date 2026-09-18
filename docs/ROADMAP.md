# Omadash roadmap

This is an early contributor preview, not a stable release. No delivery dates are promised. The product owner remains the final acceptance authority.

## First: make current workflows dependable

- Resolve the live Google denial affecting sending on both owner accounts. More specific diagnostics are now available; live retest is pending.
- Collect synthetic reproductions of inconsistent HTML rendering and fix them without weakening resource isolation.
- Validate archive, star, read/unread, trash, undo, and background synchronization against Gmail.
- Retest the corrected search submission behavior with real accounts.

Account restoration, account switching, and draft recovery have passed owner validation. See [validation status](VALIDATION.md).

## Next feature priorities

1. Complete the agreed keyboard mapping and add a shortcut guide.
2. Create, reorder, rename, and delete splits with matching previews.
3. Gmail label management from the keyboard.
4. Recipient autocomplete from account-local correspondence.
5. Per-account signatures.
6. Rich-text composition and inline images.
7. Configurable undo-send delay before dispatch.
8. Multiple calendars and calendar scheduling actions.
9. Search suggestions, saved searches, and indexing progress.
10. Reliable offline work with visible queued-action status.

Packaging and large-mailbox performance are cross-cutting work. Preserve separate account contexts, main-workspace navigation, native Qt UI, and the existing Omarchy theme integration.

## Deferred

Snooze, reminders, team collaboration, other email providers, and a unified cross-account inbox are outside the current contribution focus. Propose major scope changes in Discussions before implementation.

Start with the repository's `good first issue` and `help wanted` labels. Features involving mail delivery, OAuth, or synchronization are not beginner tasks merely because they have short descriptions.

## Starter contributions

- [#1 Shortcut guide](https://github.com/cpenzini/omadash/issues/1) — approachable UI/documentation task.
- [#2 Recipient suggestions](https://github.com/cpenzini/omadash/issues/2) — account-local autocomplete.
- [#3 Signatures](https://github.com/cpenzini/omadash/issues/3) — plain-text signatures for new drafts.
- [#4 Split ordering](https://github.com/cpenzini/omadash/issues/4) — first-match behavior and preview counts.
- [#5 HTML fixtures](https://github.com/cpenzini/omadash/issues/5) — synthetic rendering reproductions.

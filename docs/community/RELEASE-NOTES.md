# Omadash v0.1 contributor preview 06

An early native C++/Qt Gmail and Google Calendar client for Omarchy. This source preview invites testers and contributors; it is not a stable release or a packaged installer.

## Try the interface

Watch the attached 48-second `omadash-demo.mp4`, or view the animated walkthrough in the README. All mail and accounts in the demo are fictional. It shows keyboard triage, split navigation, account switching, search, selected-message replies, and the docked calendar.

Build instructions: https://github.com/cpenzini/omadash/blob/main/CONTRIBUTING.md
Tester checklist: https://github.com/cpenzini/omadash/blob/main/docs/community/TESTING.md

## Current state

Account restoration, switching, and draft recovery have passed owner validation. Automated tests cover keyboard workflows, isolated account state, HTML policy, attachments, caching, and send uncertainty handling. Search submission and nested HTML layout fixes are included.

Live sending remains blocked pending further diagnosis/retest; formatted email rendering needs broader validation. Triage and synchronization still need owner acceptance. Use fictional sample mode first. Connected Gmail requires your own Google Desktop OAuth client. Mail caches and drafts are owner-only files, not encrypted by the app; tokens use the Linux keyring.

## Help build it

We are looking for five early testers and one or two C++/Qt contributors. Start with the shortcut guide or synthetic HTML fixtures, or help with recipient suggestions, signatures, and split ordering.

Issues: https://github.com/cpenzini/omadash/issues
Introductions and questions: https://github.com/cpenzini/omadash/discussions
Roadmap: https://github.com/cpenzini/omadash/blob/main/docs/ROADMAP.md

Omadash is an independent community project. Source is MIT licensed. Final product acceptance remains with the product owner.

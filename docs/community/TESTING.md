# Early tester guide

We are looking for five early testers and one or two C++/Qt contributors. You can participate without connecting Gmail: build the app using CONTRIBUTING.md and use the fictional sample workspace.

## A ten-minute sample test

1. Navigate the inbox with J/K or arrows. Enter should open only the selected conversation.
2. Move between messages using N/P or arrows and reply to a selected message with Enter. Confirm the reply targets that message.
3. Submit a search. It should stay on the result list until you open a result.
4. Compose a draft, navigate away, and reopen it.
5. Resize the window and report clipped text or layout problems.
6. Open the calendar in the same window. Check keyboard focus when returning to mail.

Report your commit (`git rev-parse --short HEAD`), Qt version, Omarchy version if known, steps, expected result, and actual result. A screenshot with fictional content helps. Try another theme if a contrast issue appears.

## Optional connected-account checks

Use your own Desktop OAuth client and follow GOOGLE-SETUP.md. Start with messages sent between accounts you control. Sending is currently under investigation; this preview is not ready to replace your main mail client.

Check restored accounts, account separation, draft recovery, triage and undo, all-history search, and background synchronization. Test sending only when you deliberately choose to do so. Never share credentials or private email in an issue.

For HTML problems, make a synthetic HTML example that reproduces the issue. Remove real sender/recipient information, tracking URLs, attachments, and private content. Describe missing images separately from distorted layout: external images are disabled by default and configurable per account.

## Where to participate

- Bugs: https://github.com/cpenzini/omadash/issues/new/choose
- Questions, introductions, and tester reports: https://github.com/cpenzini/omadash/discussions
- Contributions: [Contribution guide](../../CONTRIBUTING.md)

Please mention which workflow you can test and whether you can build C++/Qt software. No personal email address is needed. Maintainers should acknowledge reports, link fixes back to the report, and credit contributors in release notes.

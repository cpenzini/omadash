# Security

Omadash stores mail credentials so it can speak IMAP and SMTP. Treat a compromised desktop the same way you would a compromised Thunderbird profile.

## Native binary

- Use an **app password**, never the account password. Gmail: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Fastmail and iCloud have the same idea.
- The password is written with `flutter_secure_storage` (libsecret on Linux). Hosts, ports, and identity sit in `shared_preferences`.
- IMAP and SMTP are TLS (993, 465) or STARTTLS (587). There is no “ignore certificate” switch.
- The demo mailbox is local. Connecting a real host replaces it; “Use local mailbox” forgets the saved password.

## Web client

- Mailbox and calendar secrets are stored server-side, keyed by the signed-in `user_id`. Server functions go through `authMiddleware`.
- Remote images stay blocked until you say so. Known tracking pixels never load.
- Report a leak in the sanitizer as a patch to `src/lib/mail/html.ts`.

## Contact

Open a GitHub issue for non-sensitive bugs. For a credential or sanitizer issue you do not want public, email the maintainer on the GitHub profile.

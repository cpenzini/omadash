# Google setup for preview 06

Create your own Google Cloud project for this development preview:

1. Enable the Gmail API and Google Calendar API.
2. Configure Google Auth Platform with an External audience in Testing mode. Add every Google account you intend to connect as a test user.
3. Add Gmail read-only (`gmail.readonly`), Calendar read-only (`calendar.readonly`), and Gmail modify (`gmail.modify`) scopes under Data Access.
4. Create an OAuth client with application type **Desktop app**, download its JSON, and import it through Omadash's Google app setup screen. Keep that file private; it is not included in this repository.

## Connect accounts

1. Restart Omadash with the usual launcher.
2. Connect each Google account. Select that account in Omadash, then choose **Accounts → Enable Gmail actions** and approve the requested access in Google. This enables archiving, trash, starring, read status, drafts, and sending. Calendar remains read-only.
3. If Linux asks, unlock your login keyring. Refresh credentials are stored through Secret Service (`secret-tool`), never in the mail database. If the keyring is unavailable, Omadash reports that the account cannot be remembered; it does not fall back to plaintext credentials.

Account permissions are granted in the user's browser. Development tests do not sign in, send mail, or change real messages.

Mail, search indexes, and drafts are stored locally in `.state/mail.sqlite`, with owner-only file permissions. This cache is not encrypted by Omadash; the operating system's disk encryption applies if enabled. Attachment files selected for outgoing drafts are copied into the private draft record. Disconnecting removes cached mail and the remembered credential. Local drafts are retained so unsent work can be recovered when the account reconnects; Gmail mail is not deleted.

Google may require reauthorization while this project remains in Testing mode or when access is revoked. First-time mail indexing runs in the background and can take time for a large mailbox. All-history search also queries Gmail directly, without waiting for indexing to finish.

Reference: [Google Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) and [Gmail synchronization](https://developers.google.com/workspace/gmail/api/guides/sync).

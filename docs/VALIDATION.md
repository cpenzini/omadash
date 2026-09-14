# Owner validation — September 14, 2026

| Workflow | Owner result |
| --- | --- |
| Restore both Google accounts after restart | Passed |
| Switch accounts with separate inbox/calendar/search context | Passed |
| Recover an unsent draft after restart | Passed |
| Send between accounts | Blocked: Google denied actions on both accounts; exact denial reason still needed |
| Archive, star, read/unread, trash, and undo | Not yet validated |
| Search | Failed: submitting a query opened the first conversation instead of keeping the results list |
| Incremental synchronization | Not yet independently validated |
| Formatted reading | Inconsistent; affected message/layout examples still needed |

## Corrections verified with fixtures

- Consume Enter in the search field so query submission cannot also open a conversation. A separate Enter on the results list opens the selection.
- Keep nested HTML table widths instead of stretching every table across the reader; retain responsive outer layout.
- Show actionable Google permission, policy, quota, and API-configuration errors instead of a generic denial. Allow explicit account permission reconnection without disconnecting or deleting drafts.
- Recheck granted Gmail modification permission after token renewal before dispatching a mutation.

Both automated test suites pass, including search submission, actionable error classification, and responsive HTML layout. The designed sample reader was visually inspected.

Live sending is not considered fixed until the owner successfully sends and receives a test message. No test message is sent automatically by the development checks.

# Extension surface

Omadash 0.1 has no plugin loader. You extend it by editing the modules below
and sending a pull request. This folder exists so a clone has one obvious
place to start.

| You want | Open |
| --- | --- |
| Another host (Proton, mailbox.org, …) | [`../lib/mail/presets.ts`](../lib/mail/presets.ts) |
| A typed reply | [`../lib/mail/snippets.ts`](../lib/mail/snippets.ts) |
| A palette | [`../lib/theme.ts`](../lib/theme.ts) and [`../../styles.css`](../../styles.css) |
| A key | [`../lib/mail/hotkeys.ts`](../lib/mail/hotkeys.ts) |
| The full map | [`../../docs/EXTENDING.md`](../../docs/EXTENDING.md) |

Re-exports for discoverability live in `index.ts`. Import from `@/extensions`
in experiments if you want a single barrel; production code can keep importing
the modules directly.

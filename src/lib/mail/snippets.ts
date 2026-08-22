/**
 * Compose expansions. Type `;trigger` while writing.
 * Add objects to SNIPPETS — see docs/EXTENDING.md.
 */
export interface Snippet {
  id: string;
  trigger: string;
  title: string;
  body: string;
}

export const SNIPPETS: Snippet[] = [
  {
    id: "thanks",
    trigger: "thanks",
    title: "Thanks — on it",
    body: "Thanks for the ping. I'm on it today and will follow up as soon as I have something concrete.",
  },
  {
    id: "ack",
    trigger: "ack",
    title: "Got it",
    body: "Got it — thanks. I'll take a look and come back with notes.",
  },
  {
    id: "meet",
    trigger: "meet",
    title: "Propose a time",
    body: "Does Thursday at 2:00pm Eastern work? Happy to move if that's tight — send over two other slots and I'll lock one.",
  },
  {
    id: "intro",
    trigger: "intro",
    title: "Warm intro",
    body: "Wanted to introduce you two — I think there's a useful overlap here. I'll let you take it from this thread.",
  },
  {
    id: "ooo",
    trigger: "ooo",
    title: "Out of office",
    body: "I'm out of office until Monday. I'll pick this up first thing when I'm back. If it's urgent, ping me on Signal.",
  },
  {
    id: "ship",
    trigger: "ship",
    title: "Shipped",
    body: "This is on main as of this morning. Notes are in the PR. Flag anything that still feels off and I'll hotfix.",
  },
];

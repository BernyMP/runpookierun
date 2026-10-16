import type { PublicEdition } from "../domain/editorial";
export const starterEdition: PublicEdition = {
  id: "2026-09-14",
  publishedAt: Date.parse("2026-09-20T00:00:00Z"),
  theme: "A little outside time",
  introduction:
    "Three little invitations to move, with plenty of room for real life. Start whenever you like. The third outing is a bonus, never homework.",
  sessions: [
    {
      templateId: "tiny-victory",
      prompt:
        "Choose a familiar loop. Give yourself a tiny thumbs-up when you get home.",
    },
    {
      templateId: "curiosity-loop",
      prompt:
        "Notice one small detail on your usual route. Looking after where you put your feet comes first.",
    },
    {
      templateId: "fresh-air",
      prompt:
        "Pick a comfortable route you enjoy. Your only assignment: a little fresh air.",
    },
  ],
};

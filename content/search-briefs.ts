// Query hypotheses until Search Console/Bing evidence is recorded. No invented volumes.
export const searchBriefs = {
  audience: "Busy adults returning to casual running; English-language content",
  evidenceAsOf: null as string | null,
  evidence: "Search performance baseline pending verified console access.",
  topics: [
    {
      slug: "getting-back-into-running",
      question: "How do I get back into running after a long break?",
      intent: "Choose a manageable first week and a realistic next step.",
    },
    {
      slug: "running-with-changing-schedule",
      question: "How can I run when my work schedule changes?",
      intent: "Work through a concrete scheduling change.",
    },
    {
      slug: "running-twice-a-week",
      question: "How do I organize running twice a week?",
      intent:
        "Two days, recovery space and a backup choice; no fitness guarantees.",
    },
    {
      slug: "missed-a-week-of-running",
      question: "What should I do after missing a week of running?",
      intent:
        "Resume planning without catch-up sessions; distinguish illness from scheduling.",
    },
    {
      slug: "short-runs-busy-week",
      question: "How can short runs fit a busy week?",
      intent:
        "Account for the entire time window and explain session adjustments.",
    },
    {
      slug: "pookie-vs-free-running-plan",
      question: "When is a free running plan enough?",
      intent: "Compare the actual free and paid capabilities honestly.",
    },
  ],
  // Weekly review may add aggregate, source-dated briefs here after observing real queries.
  opportunities: [] as {
    question: string;
    evidence: string;
    observedAt: string;
    relatedSlug: string;
  }[],
};

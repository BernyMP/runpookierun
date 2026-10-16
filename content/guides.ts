import { watchExportsEnabled } from "../domain/apple-watch-feature";
import { priceLabel } from "../config";
export type Guide = {
  slug: string;
  publishedAt?: number;
  modifiedAt?: number;
  title: string;
  description: string;
  summary: string;
  sections: { heading: string; paragraphs: string[] }[];
  sources: { label: string; url: string }[];
  related: string[];
};
export const guides: Guide[] = [
  {
    slug: "getting-back-into-running",
    modifiedAt: 1790087920996,
    title: "How to get back into running after a break",
    description:
      "A practical starting point for returning casual runners: choose manageable days, make room in your calendar, and adjust a week when life changes.",
    summary:
      "Start with the time and routine you can manage now, rather than your old pace or distance. Choose days with recovery space, include walking, and make the first week easy to organize. The free Pookie week offers two outings and an optional third; it is a starting example, not a test you must pass.",
    sections: [
      {
        heading: "Start with the week you have",
        paragraphs: [
          "For example, someone with a half-hour window on Monday and Thursday might reserve part of each window for getting ready and use the rest for a manageable outing. The point is a repeatable appointment, not recreating an old training week.",
          "An old running routine can be a useful memory without becoming this week’s target. Work, caring responsibilities, and the time you have today may look different. Write down the windows you can use now, including the time needed to get ready and return home.",
          "Pookie offers two or three nonadjacent running days and a starting session limit of 15, 20, or 30 minutes. Those are scheduling choices, not a promise that a particular duration is right for every runner. Warm-up and cool-down walking are included in the displayed session.",
        ],
      },
      {
        heading: "Keep the first decision small",
        paragraphs: [
          "Pick a day and a manageable time window before worrying about a long-term target. A note in your calendar may be all you need. If choosing and rearranging the next week repeatedly becomes a chore, a saved plan can be useful.",
          "The NHS Couch to 5K program provides a free structured alternative. Its beginner sessions combine running and walking, with rest days between runs. Pookie focuses on a repeatable casual routine rather than promising a 5K finish date.",
        ],
      },
      {
        heading: "Decide what happens when the week changes",
        paragraphs: [
          "Consider a Monday run that no longer fits. You could shorten that session, move it to a day with enough recovery space, or skip it. These are three different choices: a shorter run still happened, a moved run still needs a date, and a skipped run is not a completed workout.",
          "Pookie’s free weekly plan includes two easy outings and an optional third, with rest days between. Follow it without an account and keep checkmarks on your browser. A paid personal plan adds moving, shortening, and skipping sessions.",
        ],
      },
      {
        heading: "Review the routine, not just the total",
        paragraphs: [
          "At the end of a week, ask which session fitted naturally and which repeatedly conflicted with something else. Change those practical arrangements before adding more commitments. Pookie asks you to confirm the next week, including keeping the routine or explicitly choosing an easier duration.",
          "A quiet week does not erase earlier runs. The four-week view gives you a little context without turning a missed day into a broken streak.",
        ],
      },
      {
        heading: "Choose support that matches your goal",
        paragraphs: [
          watchExportsEnabled ? "Pookie is a browser-based planning companion for adults returning to casual running. It has no GPS recorder or live interval timer. You can download individual sessions for Apple Watch; see /guides/apple-watch for the import steps. Watch results do not sync back to Pookie." : "Pookie is a browser-based planning companion for adults returning to casual running. It has no GPS recorder, live interval timer, or watch sync. You can keep using a separate timer or tracker if those help you.",
          "If your return involves an injury, symptoms, or uncertainty about exercising, get appropriate professional guidance. This planning guide does not assess readiness to run or provide rehabilitation.",
        ],
      },
    ],
    sources: [
      {
        label: "NHS: Get running with Couch to 5K",
        url: "https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/",
      },
    ],
    related: [
      "running-with-changing-schedule",
      "running-twice-a-week",
      "missed-a-week-of-running",
    ],
  },
  {
    slug: "running-with-changing-schedule",
    modifiedAt: 1790087920996,
    title: "How to run when your schedule keeps changing",
    description:
      "Plan around a changing work or family schedule. A practical example of moving, shortening, or skipping a run without rebuilding your whole routine.",
    summary:
      "Choose the most realistic days first, then keep three ways to adjust: shorten the session, move it to an available day, or skip it. You do not need to squeeze every missed run back into the calendar.",
    sections: [
      {
        heading: "Separate a recurring conflict from a one-off change",
        paragraphs: [
          "If Tuesday is almost always crowded, stop treating it as an unusually bad Tuesday. Choose a different regular day. If this Tuesday is the exception, change that session without rebuilding every future week.",
          "Pookie separates these decisions. Moving a run affects that session. Editing your running preferences applies to the next week, so earlier completion records remain intact.",
        ],
      },
      {
        heading: "A simple two-day example",
        paragraphs: [
          "Imagine that you normally have time on Monday and Thursday. Monday’s plans change, but Tuesday becomes available. In your personal Pookie plan, moving Monday to Tuesday is possible when Thursday still leaves a rest day between sessions. Moving it immediately next to another planned run is not offered.",
          "This is a scheduling example, not an individualized exercise prescription. Choose a time limit that reflects your own circumstances. If your only available days are consecutive, Pookie’s current two- or three-day planner may not fit that schedule.",
        ],
      },
      {
        heading: "Use the adjustment that matches the problem",
        paragraphs: [
          "If there is less time, open the session and shorten it. If a different date works, move it. If neither fits, skip it and leave the remaining week alone. The free weekly plan lets you try the shared sessions; moving, shortening, and skipping are controls in the paid personal plan.",
          "Pookie does not treat a missed session as proof that every future run must become shorter. At the next weekly confirmation you make that choice yourself.",
        ],
      },
      {
        heading: "Give the next week a quick check",
        paragraphs: [
          "Before confirming a fresh week, look at appointments and commitments that are already fixed. Update your available days in Account when the change is lasting. Keep the same routine when it still fits.",
          "An optional Sunday email can remind you to look. It opens your current week; it does not commit you to extra sessions.",
        ],
      },
    ],
    sources: [
      {
        label: "Pookie: try the actual free weekly plan",
        url: "https://runpookierun.com/try",
      },
      {
        label: "Pookie: personal-plan features and pricing",
        url: "https://runpookierun.com/pricing",
      },
    ],
    related: [
      "getting-back-into-running",
      "missed-a-week-of-running",
      "short-runs-busy-week",
    ],
  },
  {
    slug: "running-twice-a-week",
    modifiedAt: 1790087920996,
    title: "Making room for a running routine with two available days",
    description:
      "Build a realistic two-day running schedule around your calendar, with a worked planning example and clear limits on what a habit app can provide.",
    summary:
      "If two days are what your calendar allows, plan those two deliberately. Leave space between them, include preparation time, and judge the routine by whether it fits—not by comparison with someone else’s schedule.",
    sections: [
      {
        heading: "Count the whole time commitment",
        paragraphs: [
          "A 20-minute session can require more than a 20-minute gap between appointments. Getting changed, reaching a suitable place, and getting back to your day all take time. Start with the full window, then choose the session length.",
          "Pookie’s session duration includes its warm-up and cool-down walking. It does not include your commute or getting-ready time. The setup offers 15, 20, or 30 minutes, and an individual session can be shortened later.",
        ],
      },
      {
        heading: "Choose days that can coexist",
        paragraphs: [
          "Monday and Thursday are one example of two days with recovery space. Tuesday and Friday are another. Your calendar may suggest something different. Pookie requires at least a day between running sessions, including across a week boundary.",
          "Selecting two days does not make this a race-training program or guarantee a particular fitness outcome. This is a way to organize a casual routine. A goal involving an event or a specific performance needs a suitable training plan.",
        ],
      },
      {
        heading: "Make a backup decision without adding a third obligation",
        paragraphs: [
          "A backup is a replacement, not another run you now owe. If the first day falls through, inspect whether a different date fits around the second session. When it does not, shortening or skipping may be the practical choice.",
          "The free weekly plan provides two core outings and an optional third, without an account. Moving a session to a different available date is part of the paid personal plan.",
        ],
      },
      {
        heading: "See whether the routine lasts",
        paragraphs: [
          "After a few weeks, look at which days you actually used. Pookie’s recent progress counts completed runs in four weekly windows; it does not award a perfect-attendance streak.",
          "You can keep choosing two days. The app does not automatically turn your routine into three days or increase your session duration. Changes to a longer duration require your explicit choice.",
        ],
      },
    ],
    sources: [
      {
        label: "Pookie: try the actual free weekly plan",
        url: "https://runpookierun.com/try",
      },
      {
        label: "Pookie: personal-plan features and pricing",
        url: "https://runpookierun.com/pricing",
      },
    ],
    related: [
      "getting-back-into-running",
      "running-with-changing-schedule",
      "pookie-vs-free-running-plan",
    ],
  },
  {
    slug: "missed-a-week-of-running",
    modifiedAt: 1790087920996,
    title: "Missed a week of running? How to plan your return",
    description:
      "Handle an interrupted running routine without a catch-up backlog. See how Pookie preserves history and asks you to confirm a manageable next week.",
    summary:
      "If your calendar caused the break, choose your next available days and leave missed sessions behind instead of squeezing them into the new week. If illness, injury, or symptoms caused it, this scheduling guide cannot decide when you are ready to run. Pookie keeps your history and asks you to confirm what fits next.",
    sections: [
      {
        heading: "First, identify what changed",
        paragraphs: [
          "An overloaded calendar and a run that felt physically difficult are different problems. The first may call for different days or a smaller time commitment. The second may call for a different approach and, where appropriate, professional advice.",
          "This guide addresses the planning side of an interrupted routine. It cannot tell you what exercise is appropriate after illness or injury.",
        ],
      },
      {
        heading: "Leave the old week accurate",
        paragraphs: [
          "For example, if travel wiped out Monday and Thursday, leave those outings uncompleted. Look at next week’s calendar and pick the two windows you can actually use; do not add two extra appointments to repay the old week.",
          "Only mark a run complete if you did it. A skipped session should stay skipped. This makes your later review useful: you can see the difference between a routine that was too crowded and one you actually followed.",
          "Pookie stores each week. Starting another does not overwrite earlier completions or add every missed run to the next calendar.",
        ],
      },
      {
        heading: "Confirm rather than automatically restart",
        paragraphs: [
          "When the previous week ends, Pookie asks what fits now. Keep the last approved session duration, choose the easier-week option, or explicitly select a duration within your saved time limit.",
          "A missed session alone does not trigger another automatic reduction in every future week. If you chose an easier duration, it stays your approved baseline until you deliberately change it. There is also no automatic increase after a successful week.",
        ],
      },
      {
        heading: "Make the next action visible",
        paragraphs: [
          "If your availability changed, edit your days in Account before confirming. Then open the next scheduled session and read its instructions. Use the optional weekly email if a reminder to check the plan would help.",
          "The free weekly plan gives you two easy outings and an optional third. Start again when it fits; checkmarks stay in your browser. A paid personal plan also lets you move or skip individual sessions.",
        ],
      },
    ],
    sources: [
      {
        label: "Pookie: try the actual free weekly plan",
        url: "https://runpookierun.com/try",
      },
      {
        label: "Pookie: personal-plan features and pricing",
        url: "https://runpookierun.com/pricing",
      },
    ],
    related: [
      "running-with-changing-schedule",
      "getting-back-into-running",
      "short-runs-busy-week",
    ],
  },
  {
    slug: "short-runs-busy-week",
    modifiedAt: 1790087920996,
    title: "How to fit short runs into a busy week",
    description:
      "Make a realistic plan for short running windows. Account for preparation time, shorten individual sessions, and keep a clear weekly time limit.",
    summary:
      "Plan around a usable time window, including getting ready and returning to your day. Keep the session itself clear and manageable, and use shortening as an intentional adjustment when that window shrinks.",
    sections: [
      {
        heading: "Give a short session a real place in the day",
        paragraphs: [
          "“Some time after work” is hard to protect because it has no start or finish. A specific window between existing commitments is easier to assess. Check whether you have time to change and get to an appropriate place as well as time for the session.",
          "Pookie’s 15-, 20-, and 30-minute starting limits describe the session, including walking at the beginning and end. They do not promise that the entire trip will fit into that many minutes.",
        ],
      },
      {
        heading: "Adjust the session that needs adjusting",
        paragraphs: [
          "Suppose one planned 20-minute session no longer fits. Open it and choose Shorten to reduce its duration by five minutes. The shortest session in the app is ten minutes. If that still does not fit, the app offers skipping rather than an endless series of reductions.",
          "Shortening one session does not rewrite completed runs or permanently lower your preferred limit. When the week ends, you confirm the next routine explicitly.",
        ],
      },
      {
        heading: "Use the app for planning before and recording afterward",
        paragraphs: [
          "Pookie does not provide background audio or a live interval timer. Read the session beforehand and use a timer you already trust if you need interval prompts. Record the run afterward when it is complete.",
          watchExportsEnabled ? "The app does not measure distance or pace. Individual workout files can be downloaded for Apple Watch. Import each file using our Apple Watch guide, and mark your run complete in Pookie afterward; there is no automatic results sync." : "The app also does not measure distance or pace. If those matter to you, your existing tracker can keep doing that job; there is no automatic sync between the two.",
        ],
      },
      {
        heading: "Review fit before adding more",
        paragraphs: [
          "Look at whether the selected days and time limit worked in practice. A routine that conflicts with the same appointment every week needs a scheduling change, not another reminder.",
          "Every free session includes a walking alternative. Your paid personal plan also has a Shorten control that adjusts the instructions and keeps your warm-up and cool-down.",
        ],
      },
    ],
    sources: [
      {
        label: "Pookie: try the actual free weekly plan",
        url: "https://runpookierun.com/try",
      },
      {
        label: "Pookie: personal-plan features and pricing",
        url: "https://runpookierun.com/pricing",
      },
    ],
    related: [
      "running-twice-a-week",
      "running-with-changing-schedule",
      "getting-back-into-running",
    ],
  },
  {
    slug: "pookie-vs-free-running-plan",
    modifiedAt: 1790087920996,
    title: "Free running plan or Pookie: which do you need?",
    description: `An honest comparison of a free running plan and Pookie’s ${priceLabel}/month planning companion, including what Pookie does not provide.`,
    summary:
      "Choose a free plan when a shared schedule and your own notes do the job. Pookie’s free week needs no account; its paid plan adds a saved personal schedule, changes to individual sessions, and history across weeks. Pay only if those recurring planning tasks are what you need help with.",
    sections: [
      {
        heading: "Start with what you need help doing",
        paragraphs: [
          "If you mainly need a structured beginner program, look at the free NHS Couch to 5K plan. If guided audio is useful, Nike Run Club offers free guided runs and training plans. Those are substantial alternatives, not incomplete versions of Pookie.",
          "If the recurring problem is deciding what fits this week and adapting when the calendar changes, try Pookie’s free weekly plan before considering payment.",
        ],
      },
      {
        heading: "What the subscription includes",
        paragraphs: [
          `Pookie costs ${priceLabel} USD per month after an eligible seven-day, card-required trial. It saves a weekly plan around two or three days, lets you shorten, move, or skip sessions, and asks you to confirm each new week.`,
          "It also shows completed-run counts for four recent weeks and offers an optional Sunday email. The monthly price covers the software; ongoing one-to-one coaching is not included.",
        ],
      },
      {
        heading: "What Pookie does not include",
        paragraphs: [
          watchExportsEnabled ? "Pookie offers individual workout-file downloads for Apple Watch. It does not provide a GPS recorder, live audio or interval timer, automatic watch syncing, race-specific progression, social feed, or injury rehabilitation." : "There is no GPS recorder, live audio or interval timer, watch integration, race-specific progression, social feed, or injury rehabilitation. If one of those is your main requirement, choose a tool that provides it.",
          "Pookie does not automatically increase workload after successful weeks. It is focused on maintaining a manageable casual routine, not predicting how quickly you will reach a race distance.",
        ],
      },
      {
        heading: "Try a specific task before deciding",
        paragraphs: [
          "Open the free weekly plan and look at the two core outings and optional third. Try an outing, or walk every jogging part, and mark it complete on your browser. No account or card is needed. A personal paid plan fits your available days, time limit, and experience, with adjustments and saved history.",
          "If you start the full trial, the renewal amount and date are displayed in your account. Cancel before the trial ends to avoid the first charge. There is a pre-charge reminder, and cancellation is available from Account.",
        ],
      },
      {
        heading: "Keep the choice practical",
        paragraphs: [
          "Use a free plan if it does the job. Consider Pookie if the repeated planning and adjustment is the part you want help with. The useful test is whether you return to the app and find it worth keeping—not whether you can collect more features.",
        ],
      },
    ],
    sources: [
      {
        label: "NHS: Free Couch to 5K program",
        url: "https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/",
      },
      {
        label: "Nike: Free Nike Run Club features",
        url: "https://about.nike.com/en/newsroom/releases/nike-run-club-app-new-features",
      },
    ],
    related: [
      "getting-back-into-running",
      "running-twice-a-week",
      "short-runs-busy-week",
    ],
  },
];

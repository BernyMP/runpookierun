import {
  AdMeasurement,
  AdvertisingChoices,
} from "../../components/pookie/ad-measurement";
import { useState } from "react";
import { AccountLoading } from "../../components/pookie/account-loading";
import { createRoot } from "react-dom/client";
import { PreferencesForm } from "../../components/pookie/preferences-form";
import { WeeklyConfirmation } from "../../components/pookie/weekly-confirmation";
import { RecentProgress } from "../../components/pookie/recent-progress";
import { recentProgress } from "../../domain/progress";
import { FreeProgram } from "../../components/pookie/free-program";
import { starterEdition } from "../../content/free-program";
import { WeekView } from "../../components/pookie/week-view";
import { AppleWatchGuide } from "../../components/pookie/apple-watch-guide";
import {
  applyWorkoutCommand,
  buildWeek,
  type Preferences,
  type PreferenceDraft,
} from "../../domain/planner";
import "../../app/globals.css";
const defaults: Preferences = {
  acceptedTerms: true,
  experience: "new",
  motivation: "A clearer head",
  days: [1, 4],
  minutes: 20,
  timezone: "America/Phoenix",
};
const now = Date.parse("2026-09-21T17:00:00Z");
function FreeHarness() {
  const [next, setNext] = useState(false);
  const edition = next
    ? { ...starterEdition, id: "2026-09-21", theme: "Another little adventure" }
    : starterEdition;
  return (
    <main className="app-width py-10">
      <button onClick={() => setNext((value) => !value)}>
        {next ? "Return to old edition" : "Release next edition"}
      </button>
      <FreeProgram key={edition.id} edition={edition} />
    </main>
  );
}
function LoadingHarness() {
  const [ready, setReady] = useState(false);
  const [signIn, setSignIn] = useState(false);
  if (signIn) return <h1>Sign-in opened</h1>;
  if (ready) return <h1>Account connected</h1>;
  return (
    <>
      <button onClick={() => setReady(true)}>Finish connection</button>
      <AccountLoading
        onSignInAgain={async () => {
          setSignIn(true);
        }}
      />
    </>
  );
}
function Harness() {
  const form = new URLSearchParams(location.search).has("setup");
  const confirm = new URLSearchParams(location.search).has("confirm");
  const readOnly = new URLSearchParams(location.search).has("readonly");
  const [complete, setComplete] = useState(false);
  const [week, setWeek] = useState(() => buildWeek(defaults, "2026-09-21"));
  const draft: PreferenceDraft = JSON.parse(
    localStorage.getItem("pookie:test:draft") ?? "{}",
  );
  return (
    <main className="app-width py-10">
      {form ? (
        complete ? (
          <h1>Ready for your trial</h1>
        ) : (
          <PreferencesForm
            initial={draft}
            onDraft={async (value) => {
              localStorage.setItem("pookie:test:draft", JSON.stringify(value));
            }}
            onComplete={async () => setComplete(true)}
          />
        )
      ) : confirm ? (
        complete ? (
          <>
            <WeekView
              week={week}
              today="2026-09-28"
              preferences={defaults}
              onCommand={async () => {}}
            />
            <RecentProgress weeks={recentProgress([week], "2026-09-28")} />
          </>
        ) : (
          <WeeklyConfirmation
            preferences={defaults}
            previous={week}
            onConfirm={async (choice) => {
              setWeek(
                buildWeek(defaults, "2026-09-28", week.workouts, {
                  choice,
                  approvedMinutes: week.approvedMinutes,
                }),
              );
              setComplete(true);
            }}
          />
        )
      ) : (
        <WeekView
          week={week}
          today="2026-09-21"
          preferences={defaults}
          readOnly={readOnly}
          onCommand={async (id, command) => {
            setWeek((previous) =>
              applyWorkoutCommand(previous, id, command, defaults, now),
            );
          }}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).has("ad-consent") ? (
    <>
      <AdMeasurement />
      <AdvertisingChoices />
      <h1>Advertising consent fixture</h1>
    </>
  ) : new URLSearchParams(location.search).has("watch-guide") ? (
    <AppleWatchGuide />
  ) : new URLSearchParams(location.search).has("loading") ? (
    <LoadingHarness />
  ) : new URLSearchParams(location.search).has("free") ? (
    <FreeHarness />
  ) : (
    <Harness />
  ),
);

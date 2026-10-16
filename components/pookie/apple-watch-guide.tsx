import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, Footprints, Watch } from "lucide-react";
import { buildSession } from "@/domain/sessions";
import { watchMode } from "@/domain/apple-watch-feature";
import { AppleWatchExport } from "./apple-watch-export";

const instructions = [
  {
    title: "Pick your little adventure",
    text: "Open Run Pookie Run in Safari on the iPhone paired with your Apple Watch. Choose a free session or open a run in your personal plan. Read the intervals first.",
    icon: Footprints,
  },
  {
    title: "Download, then open",
    text: "Tap Add to Apple Watch. This downloads a .workout file. Open Safari’s downloads list, or find the file in the Downloads folder in Files. Tap the file to open it.",
    icon: Download,
  },
  {
    title: "Look for Apple’s add option",
    text: "If Apple shows a workout preview with an option to add it to your watch, check the duration and intervals, then confirm. If that option is missing, stop here and see the help below.",
    icon: Watch,
  },
  {
    title: "Find it on your wrist",
    text: "Open Workout on Apple Watch and look under Outdoor Run for your Pookie workout. A walking-only session may appear under Outdoor Walk without a custom Pookie title. Check the duration before starting.",
    icon: ArrowRight,
  },
];

export function AppleWatchGuide() {
  const prototype = watchMode === "prototype";
  const sample = { ...buildSession("tiny-victory", 20), minutes: 20 };
  const steps = prototype
    ? instructions.map((step, index) =>
        index === 0
          ? {
              ...step,
              title: "Start with the test workout",
              text: "Open this preview in Safari on the iPhone paired with your Apple Watch. Use the 20-minute tiny victory lap sample above. Normal Pookie workout buttons stay off during this test.",
            }
          : index === 1
            ? {
                ...step,
                text: "Tap Download test workout above. Open Safari’s downloads list, or find the .workout file in the Downloads folder in Files. Tap the file to open it.",
              }
            : step,
      )
    : instructions;
  return (
    <main id="main" className="page-width pb-20 pt-8">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm">
        <Link href="/guides" className="underline">
          The Pookie Post
        </Link>
        <span aria-hidden="true"> / </span>Apple Watch
      </nav>
      <article>
        <header className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">A LITTLE HELP ON YOUR WRIST</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">
              Your little run.
              <br />
              Ready for your wrist.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8">
              Your warm-up, your walking breaks, your little victory lap. Take
              one Pookie workout at a time to Apple Watch.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              A workout file to open on your iPhone. No Pookie watch app, no
              extra training targets, and no need to hurry.
            </p>
            <a href="#first-workout" className="text-link mt-6">
              {prototype ? "Try the test workout" : "See the steps"}{" "}
              <span aria-hidden="true">↓</span>
            </a>
          </div>
          <Image
            src="/pookie/pookie-watch-check-v1.png"
            alt="Pookie smiling and pointing at a lavender smartwatch"
            width={1254}
            height={1254}
            sizes="(max-width: 768px) 90vw, 480px"
            priority
            className="w-full rounded-[2rem] border-[3px] border-foreground"
          />
        </header>

        <aside
          className="panel my-10 !bg-accent"
          aria-label="Compatibility and availability"
        >
          <p className="eyebrow">
            {prototype
              ? "PROTOTYPE · LET’S CHECK THE HANDOFF"
              : "BEFORE YOU DOWNLOAD"}
          </p>
          <h2 className="mt-3 text-2xl">
            An iPhone and its paired Apple Watch.
          </h2>
          <p className="mt-3 text-sm leading-7">
            This website-to-watch import has not yet been verified on physical
            devices. The file library reports iOS 26 and watchOS 26 coverage;
            that is a test target, not confirmed Pookie compatibility. Older
            versions are not verified either.
          </p>
          <p className="mt-3 text-sm leading-7">
            {prototype
              ? "This preview is for checking the handoff. Public workout buttons are still off. The steps below describe what to try, not a completed device test."
              : "Check your software versions before trying the download. If your iPhone cannot open it as a workout, use the written session while we investigate."}
          </p>
        </aside>

        <section id="first-workout" className="scroll-mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl">A few taps, then fresh air.</h2>
            <span className="text-sm text-muted-foreground">
              One workout at a time
            </span>
          </div>
          {prototype && (
            <div className="mt-6 rounded-2xl bg-secondary p-5">
              <h3 className="text-xl">Start with the tiny victory lap</h3>
              <p className="mt-2 text-sm leading-7">
                20 minutes: walk 5 minutes, repeat 30 seconds of easy jogging
                and 90 seconds of walking five times, then walk 5 minutes to
                finish.
              </p>
              <AppleWatchExport workout={sample} prototype />
            </div>
          )}
          <ol className="mt-7 grid gap-5 md:grid-cols-2">
            {steps.map(({ title, text, icon: Icon }, index) => (
              <li key={title} className="panel !p-6">
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-secondary font-bold"
                    aria-label={`Step ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="my-12 grid items-center gap-8 md:grid-cols-2">
          <Image
            src="/pookie/pookie-watch-run-v1.png"
            alt="Pookie out for an easy jog wearing a lavender smartwatch"
            width={1254}
            height={1254}
            sizes="(max-width: 768px) 90vw, 480px"
            className="w-full rounded-[2rem] border-[3px] border-foreground"
          />
          <div>
            <p className="eyebrow">YOUR PACE STILL SETS THE PACE</p>
            <h2 className="mt-4 text-3xl">
              Walking breaks included.
              <br />
              Pressure not included.
            </h2>
            <p className="mt-5 leading-8">
              The file keeps the session’s timed warm-up, jogging and walking
              intervals, and cooldown. A walking-only session becomes one timed
              outdoor walk. You can always walk any jogging part.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              When you’re finished, return to Pookie and mark your run complete.
              Downloads don’t change your checkmarks, and your watch results
              don’t sync back to Pookie.
            </p>
          </div>
        </section>

        <section aria-labelledby="watch-help">
          <h2 id="watch-help" className="text-3xl">
            A little help, if you need it.
          </h2>
          <div className="mt-6 divide-y rounded-2xl border-2 px-5">
            {[
              [
                "Where did my download go?",
                "Open Safari’s downloads list, or open Files and look in Downloads under iCloud Drive or On My iPhone, depending on your download settings. Look for a filename starting with pookie- and ending in .workout. On a computer or Android phone, open the same Pookie page on your paired iPhone to try the import.",
              ],
              [
                "There’s no option to add it to my watch",
                "Downloading a file does not prove your iPhone can import it. Try opening the downloaded file in Files. If there is still no workout preview or add option, stop and report your iOS and watchOS versions and what appeared. Don’t install another app or grant unrelated permissions for this prototype. You can still follow the session’s written steps.",
              ],
              [
                "I added it, but I can’t find it",
                "Check that your iPhone and watch are paired and connected. Look in the watch’s Workout app under Outdoor Run, including its additional workout choices; walking-only files belong under Outdoor Walk. Check for the Pookie title and matching duration. If it never appears, report that as a failed import.",
              ],
              [
                "I shortened or changed my run",
                "Download the updated session again and check its new duration before starting. An earlier watch copy won’t update automatically. Remove the older copy using the watch’s workout controls if it remains. Moving a run changes your Pookie calendar only; file exports do not schedule dates on the watch.",
              ],
              [
                "Will repeated imports make duplicates?",
                "That still needs a device test. Identical Pookie files keep the same reference, but Apple decides how imports are handled. Check for an existing copy before importing again. A changed session is a new file and may leave its older copy on the watch.",
              ],
              [
                "Does Pookie read my health data?",
                "No. This feature prepares a workout file in your browser. It does not request Health access, read activity history, or send heart rate, pace, or watch results to Pookie. Completing the workout still needs your usual checkmark in Pookie.",
              ],
            ].map(([question, answer]) => (
              <details key={question} className="py-5">
                <summary className="cursor-pointer text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                  {question}
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>
        <p className="mt-6 text-xs leading-6 text-muted-foreground">
          Pookie’s illustrations are decorative, not screenshots of Apple’s
          controls. Actual screens and wording may differ. Built using the
          unofficial{" "}
          <a href="https://github.com/bibixx/workoutkit" className="underline">
            workout-file library
          </a>
          ;{" "}
          <a
            href="https://developer.apple.com/documentation/workoutkit"
            className="underline"
          >
            Apple’s WorkoutKit documentation
          </a>{" "}
          describes the native workout framework.
        </p>
        <div className="mt-10 flex flex-wrap gap-5">
          <Link href="/try" className="text-link">
            Choose a free workout →
          </Link>
          <Link href="/pookie" className="text-link">
            Open my personal plan →
          </Link>
        </div>
      </article>
    </main>
  );
}

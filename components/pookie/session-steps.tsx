import { stepTime, type SessionStep } from "@/domain/sessions";
export function SessionSteps({
  steps,
  prompt,
}: {
  steps?: SessionStep[];
  prompt?: string;
}) {
  if (!steps) return null;
  return (
    <div className="session-instructions space-y-4">
      {(["warm-up", "main", "cool-down"] as const).map((phase) => {
        const group = steps.filter((step) => step.phase === phase);
        if (!group.length) return null;
        return (
          <section key={phase} className="rounded-2xl border-2 p-4">
            <h3 className="text-lg">
              {phase === "warm-up"
                ? "Ease into it"
                : phase === "main"
                  ? "Your little adventure"
                  : "Bring it home"}{" "}
              <span className="font-sans text-xs font-bold">
                · {stepTime(group.reduce((sum, step) => sum + step.seconds, 0))}
              </span>
            </h3>
            <ol className="mt-3 flex flex-wrap gap-2" aria-label={phase}>
              {group.map((step, index) => (
                <li
                  key={index}
                  className={`rounded-lg px-3 py-2 text-sm ${step.action === "jog" ? "bg-secondary" : "bg-accent"}`}
                >
                  <span className="mr-1 text-xs opacity-70">{index + 1}.</span>
                  {step.action === "jog" ? "Easy jog" : "Walk"}{" "}
                  {stepTime(step.seconds)}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      <p className="text-sm leading-6">
        <strong>Make it gentler:</strong> walk any jogging part, or walk the
        whole outing. Keep a comfortable effort and stop if something hurts.
      </p>
      {prompt && (
        <p className="rounded-2xl bg-accent p-4 text-sm leading-6">
          <strong>Pookie’s optional side quest:</strong> {prompt}
        </p>
      )}
    </div>
  );
}

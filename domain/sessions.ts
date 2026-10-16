export type SessionStep = {
  phase: "warm-up" | "main" | "cool-down";
  action: "walk" | "jog";
  seconds: number;
};
export const sessionTemplates = [
  {
    id: "tiny-victory",
    title: "The tiny victory lap",
    kind: "run-walk",
    pattern: [30, 90],
    prompt:
      "Pick a familiar little loop. Finishing where you started still takes you somewhere.",
  },
  {
    id: "fresh-air",
    title: "Fresh-air fan club",
    kind: "run-walk",
    pattern: [60, 120],
    prompt:
      "Notice one thing you usually hurry past. No photo required; this one's just for you.",
  },
  {
    id: "curiosity-loop",
    title: "The curiosity loop",
    kind: "run-walk",
    pattern: [30, 90, 60, 120],
    prompt:
      "Take a familiar, comfortable route and spot three little details. Keep your attention on where you're going.",
  },
  {
    id: "easy-loop",
    title: "Main-character mosey",
    kind: "run",
    pattern: [],
    prompt:
      "Take the pressure off your pace. This is your little bit of outside time.",
  },
  {
    id: "scenic-cruise",
    title: "The scenic-route club",
    kind: "run",
    pattern: [],
    prompt:
      "Choose a familiar route you enjoy. The finish line is simply coming back feeling comfortable.",
  },
  {
    id: "breather-breaks",
    title: "A run with intermissions",
    kind: "run",
    pattern: [240, 60],
    prompt:
      "Even the best shows have an intermission. Enjoy the walking breaks; they're in the script.",
  },
] as const;
export type SessionTemplateId = (typeof sessionTemplates)[number]["id"];
export function sessionTemplate(id: string) {
  const found = sessionTemplates.find((template) => template.id === id);
  if (!found) throw new Error("Unknown session template.");
  return found;
}
export function buildSession(id: string, minutes: number) {
  if (
    !Number.isInteger(minutes) ||
    minutes < 10 ||
    minutes > 30 ||
    minutes % 5 !== 0
  )
    throw new Error(
      "Choose a session between 10 and 30 minutes in five-minute steps.",
    );
  const template = sessionTemplate(id);
  const steps: SessionStep[] = [
    { phase: "warm-up", action: "walk", seconds: 300 },
  ];
  let remaining = (minutes - 10) * 60;
  let index = 0;
  while (remaining > 0) {
    if (
      template.kind === "run-walk" &&
      index % 2 === 0 &&
      remaining <
        template.pattern[index % template.pattern.length] +
          template.pattern[(index + 1) % template.pattern.length]
    ) {
      steps.push({ phase: "main", action: "walk", seconds: remaining });
      break;
    }
    const action = index % 2 === 0 ? "jog" : "walk";
    const seconds = Math.min(
      remaining,
      template.pattern.length
        ? template.pattern[index % template.pattern.length]
        : remaining,
    );
    steps.push({ phase: "main", action, seconds });
    remaining -= seconds;
    index++;
  }
  steps.push({ phase: "cool-down", action: "walk", seconds: 300 });
  return {
    templateId: template.id,
    title: minutes === 10 ? "The ten-minute reset walk" : template.title,
    playfulPrompt: template.prompt,
    steps,
    description:
      minutes === 10
        ? "A ten-minute walk. Start gently, enjoy your little reset, and finish gently."
        : `Walk for 5 minutes to warm up, enjoy ${minutes - 10} minutes of ${template.kind === "run-walk" ? "easy jog/walk intervals" : template.pattern.length ? "easy jogging with walking intermissions" : "comfortable jogging"}, then walk for 5 minutes to finish. Keep an effort where you can speak comfortably. Walking the whole session is always welcome.`,
  };
}
export function pickSession(kind: "run" | "run-walk", ordinal: number) {
  const templates = sessionTemplates.filter(
    (template) => template.kind === kind,
  );
  // Keep the same structure from week to week; novelty must not quietly increase jogging time.
  return templates[ordinal % templates.length].id;
}
export function stepTime(seconds: number) {
  return seconds % 60 === 0
    ? `${seconds / 60} min`
    : `${Math.floor(seconds / 60) ? `${Math.floor(seconds / 60)} min ` : ""}${seconds % 60} sec`;
}

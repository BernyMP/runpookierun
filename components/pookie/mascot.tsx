import Image from "next/image";
import { cn } from "@/libs/utils";
const poses = {
  run: {
    file: "run-pookie-run",
    alt: "Pookie, the smiling cartoon runner, out for a happy little run",
  },
  rest: {
    file: "pookie-chilling",
    alt: "Pookie putting their feet up for a well-earned rest",
  },
  check: {
    file: "pookie-check",
    alt: "Pookie proudly checking a run off the list",
  },
  relief: { file: "pookie-relief", alt: "Pookie taking a happy, deep breath" },
  tired: {
    file: "pookie-tired",
    alt: "Pookie catching their breath — taking it easy counts, too",
  },
  calendar: {
    file: "run-pookie-run-calendar",
    alt: "Pookie holding a calendar and giving a thumbs-up",
  },
};
export type PookiePose = keyof typeof poses;
// Original artwork restored byte-for-byte from the project's history. Keep it intact.
export function Pookie({
  pose = "run",
  className,
  priority = false,
  sizes = "(max-width: 640px) 80vw, 440px",
  decorative = false,
}: {
  pose?: PookiePose;
  className?: string;
  priority?: boolean;
  sizes?: string;
  decorative?: boolean;
}) {
  return (
    <Image
      src={`/pookie/${poses[pose].file}.png`}
      alt={decorative ? "" : poses[pose].alt}
      width={1024}
      height={1024}
      sizes={sizes}
      priority={priority}
      data-pose={pose}
      className={cn("pookie-art", className)}
    />
  );
}
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M40 0 49 27 74 13 59 38 80 46 53 52 62 78 40 60 18 78 27 52 0 46 21 38 6 13 31 27Z" />
    </svg>
  );
}

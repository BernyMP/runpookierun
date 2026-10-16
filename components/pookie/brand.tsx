import Link from "next/link";
import { Pookie } from "./mascot";
export function PookieMark({
  className = "h-12 w-12",
}: {
  className?: string;
}) {
  return (
    <span className={`brand-mark ${className}`}>
      <Pookie decorative sizes="64px" />
    </span>
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Run Pookie Run home">
      <PookieMark />
      <span className="brand-wordmark">
        run pookie run<span className="text-primary">!</span>
      </span>
    </Link>
  );
}

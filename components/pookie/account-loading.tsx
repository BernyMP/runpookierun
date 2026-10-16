"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brand } from "./brand";

export function AccountLoading({
  onSignInAgain,
}: {
  onSignInAgain: () => Promise<unknown>;
}) {
  const [slow, setSlow] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!slow)
    return (
      <div className="app-width py-24" role="status">
        Getting your running shoes ready…
      </div>
    );
  return (
    <main id="main" className="app-width space-y-6 py-20">
      <Brand />
      <section
        className="pookie-card space-y-4 p-6"
        aria-labelledby="connection-title"
      >
        <h1 id="connection-title" className="font-display text-3xl">
          A little pause, Pookie.
        </h1>
        <p role="status">
          We’re having trouble connecting to your account. Your saved runs
          haven’t changed.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button
            variant="outline"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              setSignOutFailed(false);
              try {
                await onSignInAgain();
              } catch {
                setSignOutFailed(true);
              } finally {
                setSigningOut(false);
              }
            }}
          >
            {signingOut ? "Opening sign-in…" : "Sign in again"}
          </Button>
        </div>
        {signOutFailed && (
          <p role="alert">We couldn’t open sign-in. Please try again.</p>
        )}
        <Link href="/try" className="inline-block underline">
          Use the free weekly plan meanwhile
        </Link>
      </section>
    </main>
  );
}

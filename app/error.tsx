"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="app-width py-24">
      <h1 className="text-3xl font-bold">A small stumble.</h1>
      <p className="my-5 text-muted-foreground">
        We couldn’t load this page. Your saved progress is still there.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}

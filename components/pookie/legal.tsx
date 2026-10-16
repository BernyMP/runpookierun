import type { ReactNode } from "react";
import { Brand } from "./brand";
import { Footer } from "./footer";
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="app-width py-8">
        <Brand />
      </header>
      <main id="main" className="app-width space-y-7 pb-20 pt-8">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs text-muted-foreground">
          Updated September 20, 2026
        </p>
        <div className="space-y-7 text-sm leading-7 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { Footer } from "./footer";
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="page-width header-inner">
          <Brand />
          <nav aria-label="Main">
            <Link href="/try">Free weekly plan</Link>
            <Link href="/guides">Running tips</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/sign-in" className="nav-signin">
              Sign in <ArrowUpRight size={15} />
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <Footer />
    </>
  );
}

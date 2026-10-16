import { AccountAuth } from "@/components/pookie/account-auth";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/pookie/app-provider";
import { AppHeader } from "@/components/pookie/app-header";
import { Footer } from "@/components/pookie/footer";
export const metadata = { robots: { index: false, follow: false } };
export default function PookieLayout({ children }: { children: ReactNode }) {
  return (
    <AccountAuth>
    <AppProvider>
      <AppHeader />
      <main id="main" className="app-width min-h-[65vh] pb-16 pt-7">
        {children}
      </main>
      <Footer />
    </AppProvider>
    </AccountAuth>
  );
}

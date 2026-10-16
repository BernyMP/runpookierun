import type { ReactNode } from "react";
import { AccountAuth } from "@/components/pookie/account-auth";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AccountAuth>{children}</AccountAuth>;
}

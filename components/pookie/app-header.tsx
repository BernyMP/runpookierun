"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
export function AppHeader() {
  const path = usePathname();
  return (
    <header className="app-width flex min-h-24 flex-wrap items-center justify-between gap-4 py-4">
      <Brand />
      <Link
        className="nav-signin"
        href={path === "/pookie/account" ? "/pookie" : "/pookie/account"}
      >
        {path === "/pookie/account" ? "My week" : "Account"}
      </Link>
    </header>
  );
}

import Link from "next/link";
import config from "@/config";
import { AdvertisingChoices } from "./ad-measurement";
import { Brand } from "./brand";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-width">
        <div className="footer-top">
          <div>
            <Brand />
            <p className="mt-4 text-sm">
              Made for real life. And a little running.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-start gap-x-6 gap-y-4 text-sm font-bold"
          >
            <Link href="/try">Free weekly plan</Link>
            <Link href="/guides">Running tips</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About Pookie</Link>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/tos">Terms</Link>
            <AdvertisingChoices />
            <a href={`mailto:${config.supportEmail}`}>Say hello ↗</a>
          </nav>
        </div>
        <p className="footer-cheer" aria-hidden="true">
          go, pookie, go!
        </p>
        <p className="pb-7 text-xs">Small steps. Big heart. Run Pookie Run.</p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { MarketingShell } from "@/components/pookie/marketing-shell";
import { Button } from "@/components/ui/button";
export const metadata = {
  title: "Weekly email preferences",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; error?: string }>;
}) {
  const { token, done, error } = await searchParams;
  return (
    <MarketingShell>
      <main id="main" className="app-width space-y-6 py-16">
        <h1 className="text-3xl font-bold">Your weekly emails</h1>
        {done ? (
          <p role="status">
            Your request has been processed. If you turned reminders back on
            after receiving that email, you can turn them off in Account.
          </p>
        ) : (
          <>
            <p className="leading-7 text-muted-foreground">
              Turn off the optional weekly running reminder. Your account,
              running plan, and billing notices stay the same.
            </p>
            {error && (
              <p role="alert" className="text-red-800">
                We couldn’t use that link. Try again or turn reminders off in
                Account.
              </p>
            )}
            {token && token.length <= 512 ? (
              <form action="/api/reminders/unsubscribe" method="post">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="browser" value="true" />
                <Button type="submit" className="h-12 rounded-full">
                  Turn off weekly reminders
                </Button>
              </form>
            ) : (
              <p>Please use the link in your weekly email or visit Account.</p>
            )}
          </>
        )}
        <Link
          href="/pookie/account"
          className="inline-block text-primary underline"
        >
          Manage reminders in Account
        </Link>
      </main>
    </MarketingShell>
  );
}

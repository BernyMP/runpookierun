"use client";
import { useEffect, useState, type ReactNode } from "react";
import { RedirectToSignIn, useAuth, useClerk } from "@clerk/nextjs";
import {
  ConvexReactClient,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { readAdMeasurement, adChoiceEvent } from "./ad-measurement";
import { captureAcquisition } from "./acquisition";
import { Brand } from "./brand";
import { AccountLoading } from "./account-loading";
const convex = process.env.NEXT_PUBLIC_CONVEX_URL
  ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  : null;
function Ready({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useClerk();
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const user = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const ensure = useMutation(api.users.ensure);
  const setAdMeasurement = useMutation(api.users.setAdMeasurement);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (isAuthenticated && user === null) {
      setError(false);
      ensure({
        attribution: captureAcquisition(),
        adMeasurement: readAdMeasurement(),
      }).catch(() => setError(true));
    }
  }, [isAuthenticated, user, ensure, retry]);
  const measurementUserId = user?._id;
  const measurementDeleting = user?.deleting;
  useEffect(() => {
    if (!isAuthenticated || !measurementUserId || measurementDeleting) return;
    const sync = () => {
      void setAdMeasurement({ adMeasurement: readAdMeasurement() }).catch(
        () => {
          /* Retry on focus or the next consent change. */
        },
      );
    };
    sync();
    window.addEventListener(adChoiceEvent, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(adChoiceEvent, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [
    isAuthenticated,
    measurementUserId,
    measurementDeleting,
    setAdMeasurement,
  ]);
  if (error)
    return (
      <div className="app-width py-24">
        <p>We couldn’t finish setting up your account.</p>
        <Button className="mt-4" onClick={() => setRetry((r) => r + 1)}>
          Try again
        </Button>
      </div>
    );
  if (clerkLoaded && !isSignedIn) return <RedirectToSignIn />;
  if (!clerkLoaded || isLoading || !isAuthenticated || !user)
    return (
      <AccountLoading
        onSignInAgain={() => signOut({ redirectUrl: "/sign-in" })}
      />
    );
  if (user.deleting)
    return (
      <div className="app-width py-24">Your account is being deleted.</div>
    );
  return children;
}
export function AppProvider({ children }: { children: ReactNode }) {
  if (!convex)
    return (
      <main id="main" className="app-width space-y-6 py-20">
        <Brand />
        <p>We’re getting ready to run. Please check back soon.</p>
      </main>
    );
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <Ready>{children}</Ready>
    </ConvexProviderWithClerk>
  );
}

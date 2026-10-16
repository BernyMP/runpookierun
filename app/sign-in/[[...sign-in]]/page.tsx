export const metadata = { robots: { index: false, follow: false } };
import { SignIn } from "@clerk/nextjs";
import { Brand } from "@/components/pookie/brand";
export default function SignInPage() {
  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center gap-10 px-5 py-16"
    >
      <Brand />
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <SignIn routing="path" path="/sign-in" />
      ) : (
        <p>We’re getting ready to run. Please check back soon.</p>
      )}
    </main>
  );
}

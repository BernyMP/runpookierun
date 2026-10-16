export const metadata = { robots: { index: false, follow: false } };
import { SignUp } from "@clerk/nextjs";
import { Brand } from "@/components/pookie/brand";
export default function SignUpPage() {
  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center gap-10 px-5 py-16"
    >
      <Brand />
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <SignUp routing="path" path="/sign-up" />
      ) : (
        <p>We’re getting ready to run. Please check back soon.</p>
      )}
    </main>
  );
}

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

// Load authentication only for account routes; marketing pages need no Clerk SDK.
export function AccountAuth({ children }: { children: ReactNode }) {
  return (
    <>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/pookie"
            signUpFallbackRedirectUrl="/pookie"
            appearance={{
              layout: { showOptionalFields: false },
              variables: {
                colorPrimary: "#a83213",
                colorBackground: "#fff8e6",
                colorForeground: "#2a211b",
                colorInput: "#fffdf5",
                colorInputForeground: "#2a211b",
                colorNeutral: "#2a211b",
                fontFamily: '"Trebuchet MS", Arial, sans-serif',
                fontFamilyButtons: '"Trebuchet MS", Arial, sans-serif',
                borderRadius: "1rem",
              },
              elements: {
                cardBox: {
                  border: "3px solid #2a211b",
                  boxShadow: "6px 7px 0 #2a211b",
                },
                card: { background: "#fff8e6" },
                headerTitle: {
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 800,
                },
                formFieldInput: { border: "2px solid #2a211b" },
                formButtonPrimary: {
                  border: "2px solid #2a211b",
                  boxShadow: "3px 3px 0 #2a211b",
                  fontWeight: 800,
                },
                socialButtonsBlockButton: {
                  border: "2px solid #2a211b",
                  background: "#fffdf5",
                },
                footer: { background: "#f3dfb2" },
              },
            }}
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
    </>
  );
}

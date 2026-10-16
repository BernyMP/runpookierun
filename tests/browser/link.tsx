import type { ComponentProps } from "react";
// This isolated component harness has no Next router. Public-page tests exercise
// Next's real navigation; component tests preserve the rendered anchor here.
export default function Link(props: ComponentProps<"a">) {
  return <a {...props} />;
}

import type { ComponentProps } from "react";
// The isolated harness has no Next image optimizer. The production-page tests
// exercise the real optimized images; here retain the actual local artwork.
export default function Image({
  priority,
  ...props
}: ComponentProps<"img"> & { priority?: boolean }) {
  void priority;
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ""} />;
}

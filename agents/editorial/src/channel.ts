import { eveChannel } from "eve/channels/eve";
import { timingSafeEqual } from "node:crypto";
export default eveChannel({
  auth: async (request) => {
    if (process.env.POOKIE_LOCAL_EDITOR !== "1" || process.env.VERCEL)
      return null;
    const supplied = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(
      `Bearer ${process.env.POOKIE_EDITOR_LOCAL_SECRET ?? ""}`,
    );
    if (
      !process.env.POOKIE_EDITOR_LOCAL_SECRET ||
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      return null;
    return {
      authenticator: "pookie-editorial",
      principalId: process.env.POOKIE_JOB_ID ?? "preview",
      principalType: "service",
      attributes: {},
    };
  },
});

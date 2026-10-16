import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifiedPayment } from "../domain/meta";
import { Webhook } from "svix";
const http = httpRouter();
http.route({
  path: "/editorial/worker",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.POOKIE_EDITOR_WORKER_SECRET;
    if (!secret || secret.length < 32)
      return new Response("Worker not configured", { status: 503 });
    const supplied = request.headers.get("authorization") ?? "";
    const expected = `Bearer ${secret}`;
    let difference = supplied.length ^ expected.length;
    for (let index = 0; index < expected.length; index++)
      difference |=
        (supplied.charCodeAt(index) || 0) ^ expected.charCodeAt(index);
    if (difference !== 0) return new Response("Unauthorized", { status: 401 });
    const raw = await request.text();
    if (raw.length > 100_000)
      return new Response("Request too large", { status: 413 });
    try {
      const result = await ctx.runMutation(
        internal.editorial.worker,
        JSON.parse(raw),
      );
      return Response.json(result);
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Editorial request failed.",
        },
        { status: 400 },
      );
    }
  }),
});
http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) return new Response("Webhook not configured", { status: 503 });
    const eventId = request.headers.get("svix-id");
    const timestamp = request.headers.get("svix-timestamp");
    const signature = request.headers.get("svix-signature");
    if (!eventId || !timestamp || !signature)
      return new Response("Missing signature", { status: 400 });
    let event: {
      type: string;
      data: { id?: string; payer?: { user_id?: string }; user_id?: string };
    };
    try {
      event = new Webhook(secret).verify(await request.text(), {
        "svix-id": eventId,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
      }) as typeof event;
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }
    if (event.type === "user.deleted" && event.data.id)
      await ctx.runMutation(internal.users.removeData, {
        clerkId: event.data.id,
      });
    else if (
      event.type.startsWith("subscription") ||
      event.type.startsWith("paymentAttempt")
    ) {
      if (event.type.startsWith("paymentAttempt")) {
        const payment = verifiedPayment(
          event.data,
          process.env.CLERK_PAID_PLAN_ID ?? "",
        );
        if (payment)
          await ctx.runMutation(internal.measurement.recordPayment, payment);
      }
      const clerkId = event.data.payer?.user_id ?? event.data.user_id;
      if (!clerkId) return new Response("Missing user payer", { status: 422 });
      await ctx.runMutation(internal.billing.enqueueEvent, {
        eventId,
        clerkId,
      });
    }
    return new Response("ok");
  }),
});
export default http;

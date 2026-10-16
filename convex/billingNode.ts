"use node";
import {
  createClerkClient,
  type BillingSubscriptionItem,
} from "@clerk/backend";
import { Resend } from "resend";
import config from "../config";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import {
  normalizeSubscription,
  formatPrice,
  type Subscription,
} from "../domain/billing";

function clerk() {
  if (!process.env.CLERK_SECRET_KEY)
    throw new Error("Clerk billing is not configured.");
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}
async function reconcile(
  ctx: ActionCtx,
  clerkId: string,
): Promise<Subscription> {
  const startedAt = Date.now();
  let items: BillingSubscriptionItem[];
  let trialEligible: boolean | undefined;
  try {
    const current = await clerk().billing.getUserBillingSubscription(clerkId);
    items = current.subscriptionItems;
    trialEligible = current.eligibleForFreeTrial;
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error;
    items = [];
  }
  const normalized = normalizeSubscription(
    clerkId,
    items,
    process.env.CLERK_PAID_PLAN_ID ?? "",
    startedAt,
  );
  if (trialEligible !== undefined) normalized.trialEligible = trialEligible;
  await ctx.runMutation(internal.billing.apply, { subscription: normalized });
  return normalized;
}
export const sync = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Please sign in.");
    if (
      !(await ctx.runMutation(internal.billing.claimSync, {
        clerkId: identity.subject,
      }))
    )
      return;
    try {
      await reconcile(ctx, identity.subject);
    } catch {
      throw new ConvexError(
        "We couldn't confirm billing yet. Please try again in a moment.",
      );
    }
  },
});
export const processEvent = internalAction({
  args: { eventId: v.id("billingEvents") },
  handler: async (ctx, { eventId }): Promise<void> => {
    const event = await ctx.runQuery(internal.billing.getEvent, { eventId });
    if (!event || event.status !== "pending") return;
    try {
      // Fetch current state instead of trusting event order or interpreting stale payloads.
      await reconcile(ctx, event.clerkId);
      await ctx.runMutation(internal.billing.finishEvent, {
        eventId,
        success: true,
      });
    } catch {
      await ctx.runMutation(internal.billing.finishEvent, {
        eventId,
        success: false,
      });
    }
  },
});
export const sendReminder = internalAction({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, { reminderId }): Promise<void> => {
    const reminder = await ctx.runQuery(internal.billing.getReminder, {
      reminderId,
    });
    if (!reminder || ["sent", "canceled", "failed"].includes(reminder.status))
      return;
    let leaseId: string | undefined;
    try {
      await reconcile(ctx, reminder.clerkId);
      const claimed = await ctx.runMutation(internal.billing.claimReminder, {
        reminderId,
      });
      if (!claimed) return;
      leaseId = claimed.leaseId;
      if (
        !process.env.RESEND_API_KEY ||
        !process.env.EMAIL_FROM ||
        !process.env.APP_URL
      )
        throw new Error("email_not_configured");
      const user = await clerk().users.getUser(reminder.clerkId);
      const email = user.emailAddresses.find(
        (e) =>
          e.id === user.primaryEmailAddressId &&
          e.verification?.status === "verified",
      )?.emailAddress;
      if (!email) throw new Error("verified_email_missing");
      const chargeAt = new Intl.DateTimeFormat("en-US", {
        timeZone: claimed.timezone,
        dateStyle: "full",
        timeStyle: "short",
      }).format(reminder.trialEnd);
      const billingUrl = new URL(
        "/pookie/account",
        process.env.APP_URL,
      ).toString();
      const price = formatPrice(
        claimed.subscription.amountCents,
        claimed.subscription.currency,
      );
      const { data, error } = await new Resend(
        process.env.RESEND_API_KEY,
      ).emails.send(
        {
          from: process.env.EMAIL_FROM,
          replyTo: config.supportEmail,
          to: email,
          subject: `${process.env.POOKIE_ENVIRONMENT === "staging" ? "[Staging test] " : ""}Your Pookie trial is ending`,
          text: `${process.env.POOKIE_ENVIRONMENT === "staging" ? "This is a Pookie staging test. No real payment will be collected.\n\n" : ""}A little heads-up from Pookie: your free trial ends on ${chargeAt} (${claimed.timezone}).\n\nYour saved card will be charged ${price}, then monthly, unless you cancel before the trial ends.\n\nManage or cancel your subscription: ${billingUrl}\n\nThanks for running with us.\nRun Pookie Run`,
        },
        {
          idempotencyKey: `trial-reminder/${reminder.itemId}/${reminder.trialEnd}`,
        },
      );
      if (error || !data?.id) throw new Error("email_delivery_failed");
      await ctx.runMutation(internal.billing.finishReminder, {
        reminderId,
        providerId: data.id,
        leaseId,
      });
    } catch {
      await ctx.runMutation(internal.billing.finishReminder, {
        reminderId,
        ...(leaseId ? { leaseId } : {}),
        error:
          "Reminder delivery failed; check service configuration and provider logs.",
      });
    }
  },
});
export const deleteAccount = action({
  args: { confirmation: v.literal("DELETE") },
  handler: async (ctx): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Please sign in.");
    const client = clerk();
    try {
      let items: BillingSubscriptionItem[];
      try {
        items = (
          await client.billing.getUserBillingSubscription(identity.subject)
        ).subscriptionItems;
      } catch (error) {
        if ((error as { status?: number }).status !== 404) throw error;
        items = [];
      }
      for (const item of items) {
        if (
          item.planId === process.env.CLERK_PAID_PLAN_ID &&
          ["active", "canceled", "past_due", "upcoming"].includes(item.status)
        )
          await client.billing.cancelSubscriptionItem(item.id, {
            endNow: true,
          });
      }
      // Do not remove identity or data until billing cancellation has succeeded.
      await client.users.deleteUser(identity.subject);
      await ctx.runMutation(internal.users.removeData, {
        clerkId: identity.subject,
      });
    } catch {
      throw new ConvexError(
        "We couldn't finish deleting your account. Please retry or contact support.",
      );
    }
  },
});

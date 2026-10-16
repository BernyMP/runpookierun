"use node";
import { createClerkClient } from "@clerk/backend";
import { Resend } from "resend";
import config from "../config";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { signUnsubscribe, verifyUnsubscribe } from "../domain/reminder-token";

export const send = internalAction({
  args: { reminderId: v.id("weeklyReminders") },
  handler: async (ctx, { reminderId }): Promise<void> => {
    const claimed = await ctx.runMutation(internal.weeklyReminders.claim, {
      reminderId,
    });
    if (!claimed) return;
    const { job, clerkId, leaseId } = claimed;
    try {
      const {
        CLERK_SECRET_KEY,
        RESEND_API_KEY,
        EMAIL_FROM,
        APP_URL,
        WEEKLY_REMINDER_SECRET,
      } = process.env;
      if (
        !CLERK_SECRET_KEY ||
        !RESEND_API_KEY ||
        !EMAIL_FROM ||
        !APP_URL ||
        !WEEKLY_REMINDER_SECRET
      )
        throw new Error("email_not_configured");
      const user = await createClerkClient({
        secretKey: CLERK_SECRET_KEY,
      }).users.getUser(clerkId);
      const email = user.emailAddresses.find(
        (e) =>
          e.id === user.primaryEmailAddressId &&
          e.verification?.status === "verified",
      )?.emailAddress;
      if (!email) throw new Error("verified_email_missing");
      const token = signUnsubscribe(
        job.userId,
        job.version,
        WEEKLY_REMINDER_SECRET,
      );
      const unsubscribeUrl = new URL("/unsubscribe", APP_URL);
      unsubscribeUrl.searchParams.set("token", token);
      const oneClickUrl = new URL("/api/reminders/unsubscribe", APP_URL);
      oneClickUrl.searchParams.set("token", token);
      if (
        !(await ctx.runQuery(internal.weeklyReminders.stillAllowed, {
          reminderId,
          leaseId,
        }))
      )
        return;
      const { data, error } = await new Resend(RESEND_API_KEY).emails.send(
        {
          from: EMAIL_FROM,
          replyTo: config.supportEmail,
          to: email,
          subject: `${process.env.POOKIE_ENVIRONMENT === "staging" ? "[Staging test] " : ""}A little room for running this week?`,
          text: `${process.env.POOKIE_ENVIRONMENT === "staging" ? "This is a Pookie staging test.\n\n" : ""}A fresh week can start with one small choice. Open Pookie to see your runs, move a session, or confirm your next week. No catching up needed.\n\nSee your week: ${new URL("/pookie", APP_URL)}\n\nYou chose to receive a weekly reminder. Turn these reminders off: ${unsubscribeUrl}\n\nRun Pookie Run`,
          headers: {
            "List-Unsubscribe": `<${oneClickUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
        { idempotencyKey: `weekly-reminder/${job._id}` },
      );
      if (error || !data?.id) throw new Error("email_delivery_failed");
      await ctx.runMutation(internal.weeklyReminders.finish, {
        reminderId,
        leaseId,
        providerId: data.id,
      });
    } catch {
      await ctx.runMutation(internal.weeklyReminders.finish, {
        reminderId,
        leaseId,
      });
    }
  },
});

export const unsubscribe = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<boolean> => {
    const decoded = verifyUnsubscribe(
      token,
      process.env.WEEKLY_REMINDER_SECRET ?? "",
    );
    if (!decoded) return false;
    await ctx.runMutation(internal.weeklyReminders.unsubscribe, {
      userId: decoded.userId as Id<"users">,
      version: decoded.version,
    });
    return true;
  },
});

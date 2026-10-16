import { defineAgent, defineDynamic } from "eve";
import { subscriptionModel } from "./model.ts";
export function editorialAgent(description: string) {
  return defineAgent({
    description,
    defaultTools: false,
    model: defineDynamic({
      events: {
        "step.started": () => ({
          model: subscriptionModel(),
          modelContextWindowTokens: 128000,
        }),
      },
    }),
    limits: {
      maxInputTokensPerSession: 250000,
      maxOutputTokensPerSession: 12000,
      maxTokenCostUsdPerSession: false,
      sessionTimeoutMs: 15 * 60_000,
    },
  });
}

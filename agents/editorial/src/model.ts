import { chatgpt } from "eve/models/openai";
import { wrapLanguageModel } from "ai";
import { collectSubscriptionStream } from "./subscription-stream.ts";
export function subscriptionModel() {
  if (
    process.env.POOKIE_LOCAL_EDITOR !== "1" ||
    process.env.VERCEL ||
    process.env.NODE_ENV === "production"
  )
    throw new Error(
      "Pookie generation runs locally with ChatGPT. Hosted or API fallback is disabled.",
    );
  const model = chatgpt("gpt-6-astra");
  if (typeof model === "string" || model.specificationVersion !== "v4")
    throw new Error("Eve's local ChatGPT provider is required.");
  return wrapLanguageModel({
    model: {
      ...model,
      doGenerate: async (options: Parameters<typeof model.doGenerate>[0]) =>
        collectSubscriptionStream(await model.doStream(options)),
    },
    middleware: {
      transformParams: async ({ params }) => ({
        ...params,
        temperature: undefined,
        topP: undefined,
        providerOptions: {
          openai: {
            ...params.providerOptions?.openai,
            parallelToolCalls: false,
            reasoningEffort: "medium",
          },
        },
      }),
    },
  });
}

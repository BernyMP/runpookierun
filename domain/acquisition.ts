export const sources = [
  "direct",
  "google",
  "bing",
  "chatgpt",
  "perplexity",
  "claude",
  "copilot",
  "reddit",
  "facebook",
  "instagram",
  "club",
  "friend",
  "waitlist",
  "other",
] as const;
export type Attribution = {
  source: string;
  campaign?: string;
  medium?: string;
  content?: string;
};
export function sanitizeAttribution(value?: Attribution): Attribution {
  const normalized =
    value?.source === "fb"
      ? "facebook"
      : value?.source === "ig"
        ? "instagram"
        : value?.source;
  const source = sources.includes(normalized as (typeof sources)[number])
    ? normalized!
    : "other";
  const campaign =
    value?.campaign && /^[a-z0-9_-]{1,48}$/.test(value.campaign)
      ? value.campaign
      : undefined;
  const medium = [
    "paid_social",
    "social",
    "cpc",
    "organic",
    "referral",
  ].includes(value?.medium ?? "")
    ? value!.medium
    : undefined;
  const content =
    value?.content && /^[a-z0-9_-]{1,64}$/.test(value.content)
      ? value.content
      : undefined;
  return {
    source,
    ...(campaign ? { campaign } : {}),
    ...(medium ? { medium } : {}),
    ...(content ? { content } : {}),
  };
}
export function acquisitionFromUrl(url: string, referrer = ""): Attribution {
  const parsed = new URL(url);
  const source = parsed.searchParams.get("utm_source");
  if (source)
    return sanitizeAttribution({
      source,
      campaign: parsed.searchParams.get("utm_campaign") ?? undefined,
      medium: parsed.searchParams.get("utm_medium") ?? undefined,
      content: parsed.searchParams.get("utm_content") ?? undefined,
    });
  if (!referrer) return { source: "direct" };
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === parsed.hostname) return { source: "direct" };
    for (const [domain, name] of [
      ["google.com", "google"],
      ["bing.com", "bing"],
      ["chatgpt.com", "chatgpt"],
      ["chat.openai.com", "chatgpt"],
      ["perplexity.ai", "perplexity"],
      ["perplexity.com", "perplexity"],
      ["claude.ai", "claude"],
      ["copilot.microsoft.com", "copilot"],
      ["reddit.com", "reddit"],
      ["facebook.com", "facebook"],
      ["instagram.com", "instagram"],
    ]) {
      if (host === domain || host.endsWith(`.${domain}`))
        return { source: name };
    }
  } catch {
    /* Only a coarse source is retained, never a referrer URL. */
  }
  return { source: "other" };
}

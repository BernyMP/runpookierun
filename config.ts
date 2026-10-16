const config = {
  appName: "Run Pookie Run",
  appDescription:
    "Get back into running with a week that fits your life. A flexible running companion for busy adults rebuilding a casual routine.",
  domainName: "runpookierun.com",
  supportEmail: "support@example.com",
  priceCents: 499,
  planName: "Cheaper than a cup of coffee!",
  currency: "USD",
  trialDays: 7,
};
export default config;

export const priceLabel = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: config.currency,
}).format(config.priceCents / 100);

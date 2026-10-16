const { configurationErrors } = require("./scripts/launch-config.cjs");
if (process.env.VERCEL) {
  const errors = configurationErrors("web", process.env);
  if (errors.length)
    throw new Error(`Pookie deployment blocked:\n${errors.join("\n")}`);
}
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Resolve publication metadata before streaming, so outages return a real 5xx.
  htmlLimitedBots: /.*/,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.runpookierun.com" }],
        destination: "https://runpookierun.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return process.env.VERCEL_ENV === "preview"
      ? [
          {
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
          },
        ]
      : [];
  },
};

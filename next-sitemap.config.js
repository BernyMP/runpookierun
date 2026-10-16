module.exports = {
  siteUrl: process.env.SITE_URL || "https://runpookierun.com",
  generateRobotsTxt: true,
  autoLastmod: false,
  changefreq: undefined,
  priority: undefined,
  robotsTxtOptions: {
    additionalSitemaps: ["https://runpookierun.com/content-sitemap.xml"],
    policies: [
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/pookie", "/sign-in", "/sign-up", "/api/", "/unsubscribe"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/pookie", "/sign-in", "/sign-up", "/api/", "/unsubscribe"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/pookie", "/sign-in", "/sign-up", "/api/", "/unsubscribe"],
      },
    ],
  },
  exclude: [
    ...(process.env.NEXT_PUBLIC_APPLE_WATCH_EXPORTS === "enabled" ? [] : ["/guides/apple-watch"]),
    "/content-sitemap.xml",
    "/sign-in/*",
    "/sign-up/*",
    "/sign-in",
    "/sign-up",
    "/unsubscribe",
    "/api/*",
    "/pookie",
    "/pookie/*",
    "/twitter-image.*",
    "/opengraph-image.*",
    "/opengraph-image",
    "/icon.*",
  ],
};

import config from "@/config";
export function StructuredData() {
  const url = `https://${config.domainName}`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: config.appName,
        url,
        email: config.supportEmail,
        logo: `${url}/favicon.svg`,
        subjectOf: { "@type": "WebPage", url: `${url}/about` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#app`,
        name: config.appName,
        url,
        description: config.appDescription,
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        publisher: { "@id": `${url}/#organization` },
        offers: {
          "@type": "Offer",
          url: `${url}/pricing`,
          price: (config.priceCents / 100).toFixed(2),
          priceCurrency: config.currency,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: (config.priceCents / 100).toFixed(2),
            priceCurrency: config.currency,
            billingDuration: "P1M",
          },
        },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

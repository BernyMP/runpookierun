import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
const origin = process.env.POOKIE_PREVIEW_URL || "http://127.0.0.1:4318";
const output = path.resolve("artifacts/meta-ads");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const source = await browser.newPage({
    viewport: { width: 460, height: 1000 },
    deviceScaleFactor: 3,
    reducedMotion: "reduce",
  });
  await source.goto(origin);
  await source.evaluate(() => document.fonts.ready);
  const card = source.locator('.today-card');
  await card.scrollIntoViewIfNeeded();
  const original = await card.screenshot();
  await source.getByRole("button", { name: "View run", exact: true }).click();
  await source.getByRole("button", { name: "Shorten", exact: true }).click();
  const shortened = await card.screenshot();
  const font = (
    await fs.readFile("public/fonts/Fraunces-latin.woff2")
  ).toString("base64");
  const art = (await fs.readFile("public/pookie/run-pookie-run.png")).toString(
    "base64",
  );
  const ads = [
    {
      id: "restart",
      headline: "A little structure for your running comeback.",
      support: "A weekly plan built around your days.",
      image: original,
      color: "#eee6fa",
    },
    {
      id: "flexibility",
      headline: "Busy week? Your running plan can change.",
      support: "Shorten a run. Make room for real life.",
      image: shortened,
      color: "#fff0b9",
    },
    {
      id: "simplicity",
      headline: "Two runs.<br>Room for real life.",
      support: "Choose your days. Leave room to rest.",
      image: original,
      color: "#ffd7c8",
    },
  ];
  for (const ad of ads)
    for (const format of ["feed", "stories"]) {
      const story = format === "stories",
        height = story ? 1920 : 1350;
      const page = await browser.newPage({
        viewport: { width: 1080, height },
        deviceScaleFactor: 1,
      });
      await page.setContent(`<!doctype html><html><head><style>
      @font-face{font-family:Fraunces;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{margin:0;background:${ad.color};color:#2b211b;font-family:Arial,sans-serif}.frame{height:${height}px;padding:${story ? 240 : 55}px 68px ${story ? 260 : 45}px;display:flex;flex-direction:column;position:relative}.brand{display:flex;align-items:center;gap:18px;font-family:Fraunces;font-size:38px;font-weight:900}.brand img{width:72px;height:72px;border:3px solid #2b211b;border-radius:50%;background:#ffad68;object-fit:cover}.eyebrow{font-size:21px;letter-spacing:3px;font-weight:800;margin-top:32px}h1{font-family:Fraunces;font-size:${story ? 78 : 72}px;line-height:1.03;letter-spacing:-2px;margin:20px 0 18px;font-weight:900;max-width:920px}.support{font-size:29px;line-height:1.3;margin:0 0 26px}.shot-wrap{background:#fffaf0;border:3px solid #2b211b;border-radius:26px;padding:18px;box-shadow:8px 8px 0 #2b211b;width:${story ? 800 : 590}px;max-width:100%;margin:auto 0;align-self:flex-start}.shot-wrap p{font-size:19px;letter-spacing:1px;font-weight:700;margin:2px 0 12px}.shot{max-width:100%;width:auto;max-height:${story ? 580 : 440}px;height:auto;display:block;border-radius:16px}.cta{display:inline-block;background:#ff7942;border:3px solid #2b211b;border-radius:45px;padding:20px 36px;font-size:30px;font-weight:800;align-self:flex-start;margin-top:28px}.price{font-size:25px;margin:18px 0 0;font-weight:700}.terms{font-size:21px;line-height:1.4;margin:8px 0 0}.site{font-weight:800;font-size:23px;margin:18px 0 0}
      </style></head><body><main class="frame"><div class="brand"><img src="data:image/png;base64,${art}" alt="Pookie">run pookie run!</div><div class="eyebrow">FOR YOUR RUNNING COMEBACK</div><h1>${ad.headline}</h1><p class="support">${ad.support}</p><div class="shot-wrap"><p>ACTUAL PLANNER · SAMPLE WEEK${ad.id === "flexibility" ? " · SHORTENED FROM 20 TO 15 MIN" : ""}</p><img class="shot" src="data:image/png;base64,${ad.image.toString("base64")}" alt="Sample Pookie planner"></div><div class="cta">Start my 7-day trial ↗</div><p class="price">Then $4.99/month. Card required.</p><p class="terms">Cancel in Account before your trial ends<br>to avoid a charge.</p><p class="site">runpookierun.com</p></main></body></html>`);
      await page.evaluate(() => document.fonts.ready);
      const fits = await page.evaluate(() => {
        const el = document.querySelector(".site");
        return (
          el.getBoundingClientRect().bottom <=
          innerHeight - (innerHeight === 1920 ? 240 : 20)
        );
      });
      if (!fits)
        throw new Error(`Ad content overflows safe area: ${ad.id}-${format}`);
      await page.screenshot({
        path: path.join(output, `${ad.id}-${format}.png`),
      });
      await page.close();
    }
  console.log(`Exported six ads to ${output}`);
} finally {
  await browser.close();
}

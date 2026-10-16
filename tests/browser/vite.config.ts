import { defineConfig } from "vite";
import path from "node:path";
export default defineConfig({
  // Isolated fixtures exercise the future enabled UI; never a production override.
  define: {
    "process.env.NEXT_PUBLIC_META_ENABLED": JSON.stringify("true"),
    "process.env.NEXT_PUBLIC_META_PIXEL_ID": JSON.stringify("123456"),
    "process.env.NEXT_PUBLIC_APPLE_WATCH_EXPORTS": JSON.stringify("enabled"),
  },
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, "../../public"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../.."),
      "next/navigation": path.resolve(__dirname, "navigation.ts"),
      "next/link": path.resolve(__dirname, "link.tsx"),
      "next/image": path.resolve(__dirname, "image.tsx"),
    },
  },
  esbuild: { jsx: "automatic" },
  server: {
    host: "127.0.0.1",
    port: 4318,
    strictPort: true,
    fs: { allow: [path.resolve(__dirname, "../..")] },
  },
});

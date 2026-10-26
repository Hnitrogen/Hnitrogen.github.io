import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const localEnv = new URL(".env", import.meta.url);
if (existsSync(localEnv)) loadEnvFile(fileURLToPath(localEnv));

export default defineConfig({
  site: process.env.SITE_URL || "https://hnitrogen.github.io",
  base: process.env.BASE_PATH || "/",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: false,
    },
  },
  devToolbar: { enabled: false },
});

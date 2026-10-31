// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Static site only: no server, no client-side JavaScript. Styles are emitted
// as files (not inline) so the Content-Security-Policy can stay strict.
export default defineConfig({
  site: "https://ctronixtech.com",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
  build: { inlineStylesheets: "never", format: "directory" },
  compressHTML: true,
});

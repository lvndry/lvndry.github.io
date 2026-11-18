import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import { SITE_ORIGIN } from "./site.config";

export default defineConfig({
  site: SITE_ORIGIN,
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [sitemap()],
});

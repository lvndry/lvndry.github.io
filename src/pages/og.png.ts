import type { APIRoute } from "astro";

import activityJson from "../data/activity.json";
import type { ActivityData } from "../data/types";
import { renderOgImage } from "../lib/og";

export const GET: APIRoute = () =>
  new Response(renderOgImage(activityJson as ActivityData), { headers: { "Content-Type": "image/png" } });
